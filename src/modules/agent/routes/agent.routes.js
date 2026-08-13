import express from "express";
import { agentChat } from "../controllers/agent.controller.js";
import authMiddleware from "../../auth/middlewares/auth.middleware.js";
// Igual que en products: agregar cuando quieras que el agente también
// respete los límites del plan de suscripción.
// import subscriptionMiddleware from "../../subscriptions/middlewares/subscription.middleware.js";

const router = express.Router();

router.post("/chat", authMiddleware, agentChat);

/**
 * @swagger
 * components:
 *   schemas:
 *      AgentAttachment:
 *        type: object
 *        description: Foto o PDF de una factura de compra, adjunta al mensaje. Opcional.
 *        properties:
 *          kind:
 *              type: string
 *              enum: [image, document]
 *              description: "'image' para fotos (JPG/PNG/GIF/WEBP), 'document' para PDF"
 *          mediaType:
 *              type: string
 *              description: MIME type real del archivo, ej. image/jpeg, image/png, application/pdf
 *              example: image/jpeg
 *          data:
 *              type: string
 *              format: byte
 *              description: Contenido del archivo codificado en base64 (sin el prefijo "data:...;base64,")
 *        required:
 *          - kind
 *          - mediaType
 *          - data
 *      AgentChatRequest:
 *        type: object
 *        properties:
 *          message:
 *              type: string
 *              description: Mensaje de texto en lenguaje natural del usuario. Opcional si se manda un attachment.
 *          history:
 *              type: array
 *              description: Historial de la conversación (lo que devolvió la respuesta anterior). Omitir en el primer mensaje.
 *          attachment:
 *              $ref: '#/components/schemas/AgentAttachment'
 *        example:
 *           message: Registra el ingreso de 50 unidades de COB-001 a 32000 cada una, compra a proveedor
 *      AgentChatResponse:
 *        type: object
 *        properties:
 *          reply:
 *              type: string
 *              description: Respuesta en lenguaje natural del agente
 *          history:
 *              type: array
 *              description: Historial actualizado, reenviarlo en el siguiente mensaje para mantener el contexto
 */

/**
 * @swagger
 * /api/v1/agent/chat:
 *   post:
 *     summary: Habla con el agente de IA del inventario (consultas, registro de movimientos y lectura de facturas por imagen/PDF)
 *     description: >
 *       Requiere al menos uno de "message" o "attachment". Límites del
 *       attachment (impuestos por la API de Anthropic): imágenes hasta 5MB
 *       (JPG/PNG/GIF/WEBP), PDFs hasta 32MB.
 *     tags: [Agent]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AgentChatRequest'
 *           examples:
 *             soloTexto:
 *               summary: Mensaje de texto normal
 *               value:
 *                 message: "¿Cuánto stock tengo de COB-001?"
 *                 history: []
 *             conFacturaAdjunta:
 *               summary: Foto de una factura adjunta
 *               value:
 *                 message: "Aquí está la factura del proveedor"
 *                 history: []
 *                 attachment:
 *                   kind: image
 *                   mediaType: image/jpeg
 *                   data: "/9j/4AAQSkZJRgABAQAAAQABAAD..."
 *     responses:
 *       200:
 *         description: Respuesta del agente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AgentChatResponse'
 *       400:
 *         description: Falta message/attachment, tipo de archivo no soportado, o archivo excede el tamaño máximo.
 *       401:
 *         description: Unauthorized.
 */

export default router;