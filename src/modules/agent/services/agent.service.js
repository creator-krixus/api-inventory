import Anthropic from "@anthropic-ai/sdk";
import ApiError from "../../../utils/apiError.js";
import {
  agentToolDefinitions,
  executeAgentTool,
} from "./agentTools.service.js";

const MAX_TOOL_ITERATIONS = 6;

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

const SYSTEM_PROMPT = `Eres el asistente de inventario de esta organización. Ayudas al usuario a
consultar productos y registrar movimientos de stock (ingresos, salidas y
ajustes) a partir de mensajes de texto en español, en lenguaje natural.

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

// `history` es la lista de mensajes previos (formato Anthropic: {role, content})
// que el cliente reenvía en cada request para mantener el contexto de la
// conversación. El servidor es stateless: no persiste conversaciones.
export const chatWithAgent = async ({ message, history = [], organizationId, userId }) => {
  const anthropic = getAnthropicClient();

  if (!message || typeof message !== "string" || !message.trim()) {
    throw new ApiError(400, "message is required.");
  }

  const messages = [...history, { role: "user", content: message }];

  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations += 1;

    const response = await anthropic.messages.create({
      model: getModel(),
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: agentToolDefinitions,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason !== "tool_use") {
      const textBlock = response.content.find((block) => block.type === "text");
      return {
        reply: textBlock?.text ?? "",
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