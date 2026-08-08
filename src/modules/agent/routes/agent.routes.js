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
 *      AgentChatRequest:
 *        type: object
 *        properties:
 *          message:
 *              type: string
 *              description: Mensaje de texto en lenguaje natural del usuario
 *          history:
 *              type: array
 *              description: Historial de la conversación (lo que devolvió la respuesta anterior). Omitir en el primer mensaje.
 *        required:
 *            -message
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
 *     summary: Habla con el agente de IA del inventario (consultas y registro de movimientos en lenguaje natural)
 *     tags: [Agent]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AgentChatRequest'
 *     responses:
 *       200:
 *         description: Respuesta del agente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AgentChatResponse'
 *       401:
 *         description: Unauthorized.
 */

export default router;