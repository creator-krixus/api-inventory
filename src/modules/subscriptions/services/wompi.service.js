import axios from "axios";

const WOMPI_BASE_URL =
  process.env.WOMPI_ENV === "production"
    ? "https://production.wompi.co/v1"
    : "https://sandbox.wompi.co/v1";

const privateClient = axios.create({
  baseURL: WOMPI_BASE_URL,
  headers: { Authorization: `Bearer ${process.env.WOMPI_PRIVATE_KEY}` },
});

const publicClient = axios.create({
  baseURL: WOMPI_BASE_URL,
  headers: { Authorization: `Bearer ${process.env.WOMPI_PUBLIC_KEY}` },
});

/**
 * Obtiene el token de aceptación (términos y uso de datos) que exige Wompi
 * para crear payment_sources y transacciones.
 */
export const getAcceptanceToken = async () => {
  const { data } = await publicClient.get(`/merchants/${process.env.WOMPI_PUBLIC_KEY}`);

  return {
    acceptanceToken: data.data.presigned_acceptance.acceptance_token,
    personalDataAuthToken: data.data.presigned_personal_data_auth?.acceptance_token || null,
  };
};

/**
 * Crea una fuente de pago reutilizable a partir de un token de tarjeta.
 * El cardToken se genera en el FRONTEND con Wompi.js (widget de tokenización);
 * el número de tarjeta nunca debe tocar este backend.
 */
export const createPaymentSource = async ({ cardToken, customerEmail, acceptanceToken }) => {
  const { data } = await privateClient.post("/payment_sources", {
    type: "CARD",
    token: cardToken,
    customer_email: customerEmail,
    acceptance_token: acceptanceToken,
  });

  return data.data;
};

/**
 * Cobra (crea una transacción) usando una fuente de pago ya guardada.
 * Se usa tanto en el primer cobro como en cada renovación.
 */
export const createTransaction = async ({
  amountInCents,
  customerEmail,
  paymentSourceId,
  reference,
  acceptanceToken,
}) => {
  const { data } = await privateClient.post("/transactions", {
    amount_in_cents: amountInCents,
    currency: "COP",
    customer_email: customerEmail,
    payment_method: { type: "CARD", installments: 1 },
    payment_source_id: paymentSourceId,
    reference,
    acceptance_token: acceptanceToken,
  });

  return data.data;
};

export const getTransaction = async (wompiTransactionId) => {
  const { data } = await privateClient.get(`/transactions/${wompiTransactionId}`);

  return data.data;
};

export default {
  WOMPI_BASE_URL,
  getAcceptanceToken,
  createPaymentSource,
  createTransaction,
  getTransaction,
};