import * as productService from "../../products/services/product.service.js";
import ApiError from "../../../utils/apiError.js";

// Definición de las tools que Claude puede invocar. El "schema" sigue el
// formato de tool use de la Anthropic API (input_schema = JSON Schema).
// IMPORTANTE: ninguna tool recibe organizationId ni userId desde el modelo;
// esos valores siempre se inyectan desde el req.user autenticado, nunca
// desde el texto del usuario ni desde el LLM.
export const agentToolDefinitions = [
  {
    name: "list_products",
    description:
      "Lista todos los productos del inventario de la organización, con su referencia (SKU), nombre, stock actual y precio. Útil cuando el usuario pregunta '¿qué productos tengo?', 'muéstrame el inventario', etc.",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "get_product",
    description:
      "Obtiene el detalle de un producto específico (stock, precio, costo promedio) usando su referencia/SKU. Úsalo cuando el usuario pregunte por un producto puntual, ej. '¿cuánto stock tengo de COB-001?'.",
    input_schema: {
      type: "object",
      properties: {
        reference: {
          type: "string",
          description: "Código/SKU del producto, ej. 'COB-001'.",
        },
      },
      required: ["reference"],
    },
  },
  {
    name: "register_movement",
    description:
      "Registra un movimiento de inventario (ingreso, salida o ajuste) sobre un producto existente, identificado por su referencia/SKU. Usa 'in' cuando entra mercancía (requiere unitPrice, el costo de compra), 'out' cuando sale mercancía (venta, merma, etc.), y 'adjustment' cuando el usuario da la cantidad final tras un conteo físico (quantity = nuevo stock total, no un delta).",
    input_schema: {
      type: "object",
      properties: {
        reference: {
          type: "string",
          description: "Código/SKU del producto.",
        },
        type: {
          type: "string",
          enum: ["in", "out", "adjustment"],
          description:
            "Tipo de movimiento: 'in' (ingreso), 'out' (salida), 'adjustment' (ajuste de conteo, quantity = stock final).",
        },
        quantity: {
          type: "number",
          description:
            "Cantidad del movimiento. En 'adjustment' es el stock total final, no un delta.",
        },
        unitPrice: {
          type: "number",
          description:
            "Costo unitario de compra. Obligatorio solo cuando type es 'in'.",
        },
        reason: {
          type: "string",
          description:
            "Motivo del movimiento en lenguaje natural, ej. 'Compra a proveedor', 'Venta mostrador', 'Conteo físico mensual'.",
        },
      },
      required: ["reference", "type", "quantity"],
    },
  },
  {
    name: "get_movement_history",
    description:
      "Obtiene el historial de movimientos (ingresos/salidas/ajustes) de un producto, más reciente primero. Útil para '¿qué movimientos ha tenido X producto?'.",
    input_schema: {
      type: "object",
      properties: {
        reference: {
          type: "string",
          description: "Código/SKU del producto.",
        },
      },
      required: ["reference"],
    },
  },
  {
    name: "create_product",
    description:
      "Crea un producto nuevo en el inventario (name, stock inicial, price). El campo reference es OPCIONAL: si el usuario no da un código/SKU, omite el campo por completo y el sistema generará uno automáticamente a partir del nombre. SOLO se debe llamar después de que el usuario haya confirmado explícitamente los datos (nombre, stock inicial, precio, y la referencia si el usuario dio una) en un mensaje anterior (ej. 'sí, créalo', 'confirmo', 'dale'). Si el usuario aún no ha confirmado, NO llames esta tool: primero responde en texto resumiendo los datos y pide la confirmación. Solo en el turno donde el usuario ya confirmó, llama la tool con confirmed=true.",
    input_schema: {
      type: "object",
      properties: {
        reference: {
          type: "string",
          description:
            "Código/SKU del nuevo producto, ej. 'CAR-001'. OPCIONAL: si el usuario no menciona un código, omite este campo completamente (no inventes uno tú) y el sistema le asignará uno automáticamente a partir del nombre.",
        },
        name: {
          type: "string",
          description: "Nombre del producto.",
        },
        stock: {
          type: "number",
          description: "Stock inicial del producto (0 si no se especifica).",
        },
        price: {
          type: "number",
          description: "Precio de venta del producto.",
        },
        confirmed: {
          type: "boolean",
          description:
            "Debe ser true SOLO si el usuario ya confirmó explícitamente estos datos en un mensaje anterior de la conversación. Si no hay confirmación previa del usuario, no llames esta tool.",
        },
      },
      required: ["name", "price", "confirmed"],
    },
  },
];

// Genera un código/SKU legible a partir del nombre del producto cuando el
// usuario no da uno explícito, ej. "Cartón corrugado" -> "CAR".
const buildReferenceBase = (name) => {
  const cleaned = (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quitar tildes/acentos
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .toUpperCase();

  const letters = cleaned.replace(/\s+/g, "").slice(0, 3);
  return letters || "PRD";
};

// Prueba candidatos BASE-NNN hasta encontrar uno libre para la organización.
const generateUniqueReference = async (name, organizationId) => {
  const base = buildReferenceBase(name);

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const suffix = String(Math.floor(100 + Math.random() * 900)); // 3 dígitos
    const candidate = `${base}-${suffix}`;
    // eslint-disable-next-line no-await-in-loop
    const existing = await productService.getProductByReference(candidate, organizationId);
    if (!existing) return candidate;
  }

  throw new ApiError(
    500,
    "No se pudo generar automáticamente una referencia única. Pídele al usuario que sugiera un código."
  );
};

// Ejecuta una tool por nombre. `context` trae organizationId/userId ya
// validados por el authMiddleware — el modelo nunca los controla.
export const executeAgentTool = async (toolName, toolInput, context) => {
  const { organizationId, userId } = context;

  switch (toolName) {
    case "list_products": {
      const products = await productService.getAllProducts(organizationId);
      return products.map((p) => ({
        reference: p.reference,
        name: p.name,
        stock: p.stock,
        price: p.price,
        averageCost: p.averageCost,
      }));
    }

    case "get_product": {
      const product = await productService.getProductByReference(
        toolInput.reference,
        organizationId
      );
      if (!product) {
        throw new ApiError(404, `Producto '${toolInput.reference}' no encontrado.`);
      }
      return product;
    }

    case "register_movement": {
      const { reference, type, quantity, unitPrice, reason } = toolInput;

      const result = await productService.registerMovement({
        reference,
        organizationId,
        type,
        quantity: Number(quantity),
        unitPrice: unitPrice !== undefined ? Number(unitPrice) : undefined,
        reason,
        createdBy: userId,
      });

      return {
        product: {
          reference: result.product.reference,
          name: result.product.name,
          stock: result.product.stock,
          averageCost: result.product.averageCost,
        },
        movement: {
          type: result.movement.type,
          quantity: result.movement.quantity,
          previousStock: result.movement.previousStock,
          newStock: result.movement.newStock,
        },
      };
    }

    case "get_movement_history": {
      const movements = await productService.getProductMovements({
        reference: toolInput.reference,
        organizationId,
      });
      return movements;
    }

    case "create_product": {
      const { reference, name, stock, price, confirmed } = toolInput;

      // Gate de seguridad: aunque el modelo lo pida, nunca se crea nada si
      // no viene confirmed=true. Esto obliga a que el LLM primero muestre
      // los datos al usuario en texto y espere su confirmación explícita
      // en un mensaje posterior antes de volver a llamar esta tool.
      if (confirmed !== true) {
        throw new ApiError(
          400,
          "No se creó el producto: falta confirmación explícita del usuario. Muéstrale los datos y pide que confirme antes de intentar de nuevo."
        );
      }

      const maxProducts = Number(process.env.TRIAL_MAX_PRODUCTS || 20);
      const currentCount = await productService.countProducts(organizationId);

      if (currentCount >= maxProducts) {
        throw new ApiError(
          403,
          `Límite de productos alcanzado para tu plan (${maxProducts}). Debes mejorar tu plan para agregar más.`
        );
      }

      let finalReference = reference?.trim();

      if (finalReference) {
        const existing = await productService.getProductByReference(finalReference, organizationId);
        if (existing) {
          throw new ApiError(409, `Ya existe un producto con la referencia '${finalReference}'.`);
        }
      } else {
        // El usuario no dio código: se genera uno automáticamente a partir del nombre.
        finalReference = await generateUniqueReference(name, organizationId);
      }

      const product = await productService.createProduct({
        reference: finalReference,
        name,
        stock: stock !== undefined ? Number(stock) : 0,
        price: Number(price),
        organizationId,
      });

      return {
        reference: product.reference,
        name: product.name,
        stock: product.stock,
        price: product.price,
      };
    }

    default:
      throw new ApiError(400, `Tool desconocida: ${toolName}`);
  }
};