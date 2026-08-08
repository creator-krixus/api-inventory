import ApiError from "../../../utils/apiError.js";
import { verifyWompiSignature } from "../../../utils/wompiSignature.js";
import * as subscriptionService from "../services/subscription.service.js";

export const getPlans = async (req, res, next) => {
  try {
    const plans = await subscriptionService.getPlans();

    res.status(200).json(plans);
  } catch (error) {
    next(error);
  }
};

export const getAcceptanceToken = async (req, res, next) => {
  try {
    const tokens = await subscriptionService.getAcceptanceToken();

    res.status(200).json(tokens);
  } catch (error) {
    next(new ApiError(502, "Could not connect to Wompi."));
  }
};

export const getMySubscription = async (req, res, next) => {
  try {
    const subscription = await subscriptionService.getMySubscription(req.user.organizationId);

    res.status(200).json(subscription);
  } catch (error) {
    next(error);
  }
};

export const subscribe = async (req, res, next) => {
  try {
    const { planSlug, cardToken } = req.body;

    if (!planSlug || !cardToken) {
      throw new ApiError(400, "planSlug and cardToken are required.");
    }

    const result = await subscriptionService.subscribe({
      organizationId: req.user.organizationId,
      planSlug,
      cardToken,
      customerEmail: req.user.email,
    });

    res.status(201).json(result);
  } catch (error) {
    const wompiError = error.response?.data?.error?.messages;

    if (wompiError) {
      return next(new ApiError(400, JSON.stringify(wompiError)));
    }

    next(error);
  }
};

export const cancelSubscription = async (req, res, next) => {
  try {
    const subscription = await subscriptionService.cancelSubscription(req.user.organizationId);

    res.status(200).json({
      message: `Your subscription will cancel on ${subscription.currentPeriodEnd.toISOString()}.`,
      subscription,
    });
  } catch (error) {
    next(error);
  }
};

// Endpoint público — lo llama Wompi, no un usuario autenticado.
export const handleWebhook = async (req, res) => {
  try {
    const isValid = verifyWompiSignature(req.body);

    if (!isValid) {
      return res.status(401).json({ message: "Invalid signature." });
    }

    await subscriptionService.processWebhookEvent(req.body);

    res.status(200).json({ received: true });
  } catch (error) {
    // Siempre respondemos 200 salvo firma inválida, para que Wompi no reintente
    // infinitamente por un error nuestro; el error queda logueado para revisión manual.
    console.error("Error procesando webhook de Wompi:", error.message);
    res.status(200).json({ received: true, note: "Logged for manual review." });
  }
};

// Endpoint protegido con CRON_SECRET — lo llama un scheduler externo, no un usuario.
export const renewSubscriptions = async (req, res, next) => {
  try {
    if (req.headers["x-cron-secret"] !== process.env.CRON_SECRET) {
      throw new ApiError(401, "Unauthorized.");
    }

    const results = await subscriptionService.renewDueSubscriptions();

    res.status(200).json({ processed: results.length, results });
  } catch (error) {
    next(error);
  }
};