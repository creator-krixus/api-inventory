import Plan from "../models/plan.model.js";
import Subscription from "../models/subscription.model.js";
import Transaction from "../models/transaction.model.js";
import ApiError from "../../../utils/apiError.js";
import * as wompi from "./wompi.service.js";

// Suma un intervalo (mes/año) a una fecha
const addInterval = (date, interval) => {
  const result = new Date(date);

  if (interval === "year") {
    result.setFullYear(result.getFullYear() + 1);
  } else {
    result.setMonth(result.getMonth() + 1);
  }

  return result;
};

export const getPlans = async () => {
  return await Plan.find({ status: "active" }).sort({ priceInCents: 1 }).lean();
};

export const getAcceptanceToken = async () => {
  const tokens = await wompi.getAcceptanceToken();

  return { ...tokens, publicKey: process.env.WOMPI_PUBLIC_KEY };
};

export const getMySubscription = async (organizationId) => {
  const subscription = await Subscription.findOne({ organizationId }).populate("plan");

  if (!subscription) {
    throw new ApiError(404, "Subscription not found for this organization.");
  }

  return subscription;
};

export const subscribe = async ({ organizationId, planSlug, cardToken, customerEmail }) => {
  const plan = await Plan.findOne({ slug: planSlug, status: "active" });

  if (!plan) {
    throw new ApiError(404, "Plan not found.");
  }

  const subscription = await Subscription.findOne({ organizationId });

  if (!subscription) {
    throw new ApiError(404, "Subscription not found for this organization.");
  }

  const { acceptanceToken } = await wompi.getAcceptanceToken();

  // 1. Tokeniza la tarjeta como fuente de pago reutilizable
  const paymentSource = await wompi.createPaymentSource({
    cardToken,
    customerEmail: customerEmail || subscription.customerEmail,
    acceptanceToken,
  });

  // 2. Cobra el primer período usando esa fuente de pago
  const reference = `sub_${organizationId}_${Date.now()}`;
  const wompiTransaction = await wompi.createTransaction({
    amountInCents: plan.priceInCents,
    customerEmail: customerEmail || subscription.customerEmail,
    paymentSourceId: paymentSource.id,
    reference,
    acceptanceToken,
  });

  const transaction = await Transaction.create({
    organizationId,
    subscription: subscription._id,
    reference,
    wompiTransactionId: wompiTransaction.id,
    amountInCents: plan.priceInCents,
    status: wompiTransaction.status, // PENDING | APPROVED | DECLINED | ERROR
    kind: "subscription_initial",
    rawResponse: wompiTransaction,
  });

  // Wompi suele responder PENDING y confirma el estado final por webhook.
  // Si ya viene APPROVED (pasa en sandbox/algunos métodos), activamos de una vez.
  subscription.plan = plan._id;
  subscription.wompiPaymentSourceId = paymentSource.id;

  if (wompiTransaction.status === "APPROVED") {
    subscription.status = "active";
    subscription.currentPeriodStart = new Date();
    subscription.currentPeriodEnd = addInterval(new Date(), plan.interval);
  }

  await subscription.save();

  return {
    subscription,
    transaction: { id: transaction._id, status: transaction.status, reference },
    message:
      wompiTransaction.status === "APPROVED"
        ? "Subscription activated."
        : "Payment in progress, it will be confirmed shortly via webhook.",
  };
};

export const cancelSubscription = async (organizationId) => {
  const subscription = await Subscription.findOneAndUpdate(
    { organizationId },
    { cancelAtPeriodEnd: true },
    { returnDocument: "after" }
  );

  if (!subscription) {
    throw new ApiError(404, "Subscription not found.");
  }

  return subscription;
};

export const processWebhookEvent = async (eventBody) => {
  const wompiTransaction = eventBody?.data?.transaction;

  if (!wompiTransaction) {
    throw new ApiError(400, "Event without transaction.");
  }

  const transaction = await Transaction.findOne({ reference: wompiTransaction.reference });

  if (!transaction) {
    // Puede ser un evento de una transacción que no generamos nosotros; se ignora sin error
    return { ignored: true, reason: "Unknown reference." };
  }

  transaction.status = wompiTransaction.status;
  transaction.wompiTransactionId = wompiTransaction.id;
  transaction.rawResponse = wompiTransaction;
  await transaction.save();

  const subscription = await Subscription.findById(transaction.subscription).populate("plan");

  if (!subscription) {
    return { ignored: true, reason: "Subscription not found." };
  }

  if (wompiTransaction.status === "APPROVED") {
    const interval = subscription.plan?.interval || "month";
    subscription.status = "active";

    // En una renovación, el nuevo período arranca donde terminaba el anterior (no "ahora"),
    // para no regalar ni cobrar días de más si el webhook llega con retraso.
    const base =
      subscription.currentPeriodEnd && subscription.currentPeriodEnd > new Date()
        ? subscription.currentPeriodEnd
        : new Date();

    subscription.currentPeriodStart = base;
    subscription.currentPeriodEnd = addInterval(base, interval);
    subscription.lastPaymentError = null;
  } else if (["DECLINED", "ERROR"].includes(wompiTransaction.status)) {
    subscription.status = "past_due";
    subscription.lastPaymentError = wompiTransaction.status_message || wompiTransaction.status;
  }

  await subscription.save();

  return { ignored: false };
};

export const renewDueSubscriptions = async () => {
  const due = await Subscription.find({
    status: "active",
    cancelAtPeriodEnd: false,
    currentPeriodEnd: { $lte: new Date() },
    wompiPaymentSourceId: { $ne: null },
  }).populate("plan");

  const results = [];

  for (const subscription of due) {
    try {
      const reference = `sub_renew_${subscription.organizationId}_${Date.now()}`;

      const wompiTransaction = await wompi.createTransaction({
        amountInCents: subscription.plan.priceInCents,
        customerEmail: subscription.customerEmail,
        paymentSourceId: subscription.wompiPaymentSourceId,
        reference,
      });

      await Transaction.create({
        organizationId: subscription.organizationId,
        subscription: subscription._id,
        reference,
        wompiTransactionId: wompiTransaction.id,
        amountInCents: subscription.plan.priceInCents,
        status: wompiTransaction.status,
        kind: "subscription_renewal",
        rawResponse: wompiTransaction,
      });

      // El estado final (APPROVED/DECLINED) se confirma vía webhook; aquí solo dejamos
      // registro de que se intentó, para no cobrar dos veces en la próxima corrida.
      subscription.currentPeriodEnd = addInterval(
        subscription.currentPeriodEnd,
        subscription.plan.interval || "month"
      );
      await subscription.save();

      results.push({ organizationId: subscription.organizationId, reference, status: wompiTransaction.status });
    } catch (error) {
      subscription.status = "past_due";
      subscription.lastPaymentError = error.response?.data?.error?.messages
        ? JSON.stringify(error.response.data.error.messages)
        : error.message;
      await subscription.save();

      results.push({ organizationId: subscription.organizationId, error: subscription.lastPaymentError });
    }
  }

  return results;
};

export { addInterval };