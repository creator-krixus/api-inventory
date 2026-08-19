import Anthropic from "@anthropic-ai/sdk";
import ApiError from "../../../utils/apiError.js";
import {
  agentToolDefinitions,
  executeAgentTool,
} from "./agentTools.service.js";

const MAX_TOOL_ITERATIONS = 6;

// Cuántos "turnos" (mensaje del usuario + respuesta final del agente,
// incluyendo los tool calls intermedios de ese turno) se conservan como
// máximo en el historial antes de recortar los más viejos. Cada turno
// nuevo hace más caro el siguiente mensaje (se reenvía todo el historial
// a la API), así que este límite evita que el costo crezca sin fin en
// conversaciones muy largas. Configurable por env var.
const getMaxHistoryTurns = () => Number(process.env.AGENT_MAX_HISTORY_TURNS) || 10;

const CACHE_CONTROL = { type: "ephemeral" };

// Cliente perezoso: NO se crea al importar el módulo. Si se instanciara a
// nivel de módulo, en ESM los imports (y por tanto este archivo) se
// resuelven antes que dotenv.config() corra en server.js, así que
// process.env.ANTHROPIC_API_KEY todavía estaría undefined en ese momento.
let anthropicClient = null;

const getAnthropicClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ApiError(500, "ANTHROPIC_API_KEY no está configurada en el servidor.");
  }

  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  return anthropicClient;
};

const getModel = () => process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// Límites duros de la API de Anthropic para contenido multimedia.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_DOCUMENT_BYTES = 32 * 1024 * 1024; // 32 MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const ALLOWED_DOCUMENT_TYPES = ["application/pdf"];

const SYSTEM_PROMPT = `Eres el asistente de inventario de esta organización. Ayudas al usuario a
consultar productos y registrar movimientos de stock (ingresos, salidas y
ajustes) a partir de mensajes de texto en español, en lenguaje natural.
También puedes recibir fotos o PDFs de facturas de compra, que debes leer
tú mismo (tienes visión) para extraer la información.

Reglas importantes:
- Todas las cantidades y precios deben confirmarse con el usuario antes de
  ejecutar la acción SOLO si el mensaje es ambiguo. Si el mensaje ya trae
  toda la información necesaria (referencia, tipo de movimiento, cantidad,
  y costo cuando aplica), ejecuta la acción directamente sin pedir
  confirmación redundante.
- Para movimientos "in" (ingreso) SIEMPRE necesitas el costo unitario
  (unitPrice). Si el usuario no lo da, pregúntalo antes de registrar el
  movimiento.
- Para "adjustment", la cantidad que da el usuario es el STOCK FINAL total
  tras un conteo físico, no un delta. Acláralo si hay ambigüedad.
- Si no encuentras un producto por su referencia, dilo claramente y
  pregunta si el usuario quiere revisar el listado de productos.
- Crear un producto nuevo es una acción sensible: NUNCA llames
  create_product en el mismo turno en que detectas que hace falta un
  producto nuevo. Primero responde en texto resumiendo los datos que vas a
  usar (nombre, stock inicial, precio, y la referencia solo si el usuario
  dio una) y pregunta explícitamente si el usuario confirma. Solo cuando
  el usuario responda afirmativamente en un mensaje posterior (ej. "sí",
  "confirmo", "dale", "créalo así"), llama a create_product con
  confirmed=true. Si el usuario cambia algún dato al confirmar, usa los
  datos actualizados.
- La referencia/SKU (reference) es OPCIONAL al crear un producto: si el
  usuario solo da el nombre (y opcionalmente precio/stock) pero no
  menciona un código, NO se lo pidas ni inventes uno tú mismo — omite el
  campo reference al llamar la tool y el sistema le asignará uno
  automáticamente. Después de crear el producto, dile al usuario cuál
  quedó asignado.
- Cuando el usuario adjunta una foto o PDF de una factura de compra: lee
  con cuidado cada línea (nombre del producto, cantidad, costo unitario).
  Para cada línea, busca si el producto ya existe en el inventario (usa
  list_products o get_product) comparando por nombre, no asumas que la
  referencia de la factura coincide con tu SKU interno. Luego responde en
  texto UN SOLO resumen con TODAS las líneas leídas (producto, cantidad,
  costo, y si ya existe o habría que crearlo) y pide confirmación general
  antes de ejecutar nada — NUNCA registres movimientos ni crees productos
  directamente a partir de una imagen sin que el usuario confirme los
  datos leídos, ya que la lectura de una foto puede tener errores (mala
  letra, foto borrosa, etc.). Si algún dato es ilegible o dudoso,
  dilo explícitamente en vez de inventarlo.
- Responde siempre en español, de forma breve y clara, como si fueras un
  compañero de bodega que además sabe usar el sistema. No expongas
  detalles técnicos (ids de Mongo, nombres de funciones, etc).
- Nunca inventes datos de productos o movimientos: si necesitas un dato,
  usa las tools disponibles para consultarlo.`;

// Convierte el resultado (o error) de una tool en un bloque tool_result
// válido para la API de Anthropic.
const buildToolResultBlock = (toolUseBlock, result, isError = false) => ({
  type: "tool_result",
  tool_use_id: toolUseBlock.id,
  content: JSON.stringify(result),
  is_error: isError,
});

// Un "turno" nuevo siempre arranca con un mensaje del usuario que es texto
// plano (string) O un array que empieza con un bloque real (imagen,
// documento, texto) — nunca con un tool_result. Los mensajes que el loop
// de tools agrega a mitad de turno son { role:"user", content: [...] }
// donde TODOS los bloques son tool_result, así que se distinguen mirando
// el primer bloque. chatWithAgent solo devuelve el history cuando el loop
// terminó en una respuesta final (nunca a mitad de un tool call), así que
// el `history` que llega aquí siempre contiene turnos completos — es
// seguro cortar justo en un límite de turno sin partir un
// tool_use/tool_result a la mitad.
const isTurnStart = (entry) => {
  if (entry.role !== "user") return false;
  if (typeof entry.content === "string") return true;
  return Array.isArray(entry.content) && entry.content[0]?.type !== "tool_result";
};

const trimHistoryToLastTurns = (history, maxTurns) => {
  const turnStartIndexes = [];

  history.forEach((entry, index) => {
    if (isTurnStart(entry)) {
      turnStartIndexes.push(index);
    }
  });

  if (turnStartIndexes.length <= maxTurns) {
    return history;
  }

  const cutIndex = turnStartIndexes[turnStartIndexes.length - maxTurns];
  return history.slice(cutIndex);
};

// Marca el ÚLTIMO bloque del ÚLTIMO mensaje con un breakpoint de prompt
// caching, y limpia cualquier breakpoint que hubiera quedado de una
// llamada anterior (Anthropic permite máximo 4 breakpoints por request;
// solo necesitamos uno activo al final). Como el historial se reenvía
// completo turno a turno, todo lo anterior al breakpoint es un prefijo
// idéntico al de la llamada previa, así que Claude lo sirve desde caché
// en vez de volver a cobrarlo como tokens de entrada nuevos.
// IMPORTANTE: esto se aplica solo sobre una copia usada para la llamada a
// la API — nunca se persiste en el `messages`/`history` que se guarda o
// se le devuelve al cliente.
const withCacheControl = (messages) => {
  const cloned = messages.map((entry) => ({
    ...entry,
    content:
      typeof entry.content === "string"
        ? entry.content
        : entry.content.map(({ cache_control, ...block }) => block),
  }));

  const last = cloned[cloned.length - 1];

  if (typeof last.content === "string") {
    last.content = [{ type: "text", text: last.content, cache_control: CACHE_CONTROL }];
  } else {
    const blocks = last.content;
    blocks[blocks.length - 1] = { ...blocks[blocks.length - 1], cache_control: CACHE_CONTROL };
  }

  return cloned;
};

// Valida el adjunto (imagen o PDF) que mandó el frontend y arma el bloque
// de contenido que espera la API de Anthropic. Se valida el tamaño real en
// bytes (no el tamaño en base64, que es ~33% más grande) por seguridad,
// aunque el frontend ya debería haber comprimido/rechazado archivos
// grandes antes de llegar aquí — nunca hay que confiar solo en el cliente.
const buildAttachmentBlock = (attachment) => {
  const { kind, mediaType, data } = attachment;

  if (!data || typeof data !== "string") {
    throw new ApiError(400, "attachment.data es requerido (base64).");
  }

  const approxBytes = Math.floor((data.length * 3) / 4);

  if (kind === "image") {
    if (!ALLOWED_IMAGE_TYPES.includes(mediaType)) {
      throw new ApiError(400, `Tipo de imagen no soportado: ${mediaType}.`);
    }
    if (approxBytes > MAX_IMAGE_BYTES) {
      throw new ApiError(400, "La imagen supera el máximo de 5 MB permitido.");
    }
    return { type: "image", source: { type: "base64", media_type: mediaType, data } };
  }

  if (kind === "document") {
    if (!ALLOWED_DOCUMENT_TYPES.includes(mediaType)) {
      throw new ApiError(400, `Tipo de documento no soportado: ${mediaType}.`);
    }
    if (approxBytes > MAX_DOCUMENT_BYTES) {
      throw new ApiError(400, "El PDF supera el máximo de 32 MB permitido.");
    }
    return { type: "document", source: { type: "base64", media_type: mediaType, data } };
  }

  throw new ApiError(400, `attachment.kind inválido: ${kind}. Debe ser "image" o "document".`);
};

// `history` es la lista de mensajes previos (formato Anthropic: {role, content})
// que el cliente reenvía en cada request para mantener el contexto de la
// conversación. El servidor es stateless: no persiste conversaciones.
export const chatWithAgent = async ({ message, history = [], organizationId, userId, attachment }) => {
  const anthropic = getAnthropicClient();

  const trimmedMessage = typeof message === "string" ? message.trim() : "";

  if (!trimmedMessage && !attachment) {
    throw new ApiError(400, "message o attachment son requeridos.");
  }

  // Si el usuario solo adjunta el archivo sin escribir nada, se le da al
  // modelo una instrucción por defecto para que sepa qué hacer.
  const textForModel = trimmedMessage || "Adjunto la foto/PDF de una factura de compra. Revísala y dime qué encontraste.";

  let userContent = textForModel;

  if (attachment) {
    const attachmentBlock = buildAttachmentBlock(attachment);
    // La imagen/documento va primero, seguido del texto — es el orden que
    // recomienda Anthropic para que el modelo interprete mejor el adjunto.
    userContent = [attachmentBlock, { type: "text", text: textForModel }];
  }

  const trimmedHistory = trimHistoryToLastTurns(history, getMaxHistoryTurns());
  const messages = [...trimmedHistory, { role: "user", content: userContent }];

  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations += 1;

    const response = await anthropic.messages.create({
      model: getModel(),
      // 1024 se quedaba corto para tareas con imagen: Claude gasta parte
      // del presupuesto "pensando" internamente antes de escribir texto o
      // llamar una tool, y con poco margen la respuesta podía cortarse a
      // mitad de ese razonamiento (reply vacío). max_tokens es solo un
      // TECHO, no un gasto garantizado — subirlo no cuesta más a menos
      // que el modelo realmente lo use.
      max_tokens: 4096,
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: CACHE_CONTROL }],
      tools: agentToolDefinitions.map((tool, index, arr) =>
        index === arr.length - 1 ? { ...tool, cache_control: CACHE_CONTROL } : tool
      ),
      messages: withCacheControl(messages),
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((block) => block.type === "text");

      if (!textBlock) {
        // No debería pasar con max_tokens=4096, pero por si acaso: mejor
        // avisar claramente que dejar una burbuja vacía en el chat.
        console.warn(
          "[agent] Respuesta sin bloque de texto. stop_reason:",
          response.stop_reason,
          "| content types:",
          response.content.map((b) => b.type)
        );
      }

      return {
        reply: textBlock?.text || "No pude generar una respuesta esta vez. ¿Puedes intentar de nuevo?",
        history: messages,
      };
    }

    // Puede haber varios tool_use en un mismo turno (llamadas paralelas)
    const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => {
        try {
          const result = await executeAgentTool(block.name, block.input, {
            organizationId,
            userId,
          });
          return buildToolResultBlock(block, result, false);
        } catch (error) {
          const message = error instanceof ApiError ? error.message : "Error interno ejecutando la acción.";
          return buildToolResultBlock(block, { error: message }, true);
        }
      })
    );

    messages.push({ role: "user", content: toolResults });
  }

  throw new ApiError(500, "El agente no pudo completar la solicitud (demasiadas iteraciones).");
};