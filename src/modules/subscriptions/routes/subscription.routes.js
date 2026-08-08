import express from "express";
import {
  getPlans,
  getAcceptanceToken,
  getMySubscription,
  subscribe,
  cancelSubscription,
  handleWebhook,
  renewSubscriptions,
} from "../controllers/subscription.controller.js";
import authMiddleware from "../../auth/middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/v1/subscriptions/plans:
 *   get:
 *     summary: List available subscription plans.
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: List of plans.
 */
router.get("/plans", getPlans);

// La llama Wompi directamente (no lleva JWT, se valida con firma propia)
router.post("/webhook", express.json(), handleWebhook);

// La llama un cron externo, protegido con el header x-cron-secret
router.post("/renew", renewSubscriptions);

/**
 * @swagger
 * /api/v1/subscriptions/wompi/acceptance-token:
 *   get:
 *     summary: Get the Wompi acceptance token needed to tokenize a card.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Acceptance token.
 */
router.get("/wompi/acceptance-token", authMiddleware, getAcceptanceToken);

/**
 * @swagger
 * /api/v1/subscriptions/me:
 *   get:
 *     summary: Get the authenticated organization's subscription.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription info.
 *       404:
 *         description: Subscription not found.
 */
router.get("/me", authMiddleware, getMySubscription);

/**
 * @swagger
 * components:
 *   schemas:
 *      Subscribe:
 *        type: object
 *        properties:
 *          planSlug:
 *              type: string
 *              description: Slug del plan (ej. basic, pro)
 *          cardToken:
 *              type: string
 *              description: Token de tarjeta generado en el frontend con Wompi.js
 *        required:
 *            -planSlug
 *            -cardToken
 *        example:
 *           planSlug: basic
 *           cardToken: tok_test_xxxxxxxxxxxx
 */

/**
 * @swagger
 * /api/v1/subscriptions/subscribe:
 *   post:
 *     summary: Subscribe the authenticated organization to a paid plan.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Subscribe'
 *     responses:
 *       201:
 *         description: Subscription activated or payment in progress.
 */
router.post("/subscribe", authMiddleware, subscribe);

/**
 * @swagger
 * /api/v1/subscriptions/cancel:
 *   post:
 *     summary: Cancel the subscription at the end of the current period.
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription set to cancel at period end.
 */
router.post("/cancel", authMiddleware, cancelSubscription);

export default router;