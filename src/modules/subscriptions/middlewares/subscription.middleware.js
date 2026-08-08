import Subscription from "../models/subscription.model.js";

/**
 * Bloquea el acceso si la organización no tiene una suscripción activa o un
 * trial vigente. Adjunta req.subscription para que los controladores puedan
 * usar sus límites de plan (ej. maxProducts).
 */
const subscriptionMiddleware = async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({
      organizationId: req.user.organizationId,
    }).populate("plan");

    if (!subscription) {
      return res.status(402).json({
        message: "This organization has no subscription. Contact support.",
      });
    }

    const now = new Date();
    const isTrialValid = subscription.status === "trialing" && subscription.currentPeriodEnd > now;
    const isActive = subscription.status === "active" && subscription.currentPeriodEnd > now;

    if (!isTrialValid && !isActive) {
      return res.status(402).json({
        message:
          subscription.status === "trialing"
            ? "Your trial period has ended. Subscribe to keep using the app."
            : "Your subscription is not active. Check your payment method.",
        subscriptionStatus: subscription.status,
      });
    }

    req.subscription = subscription;
    next();
  } catch (error) {
    next(error);
  }
};

export default subscriptionMiddleware;