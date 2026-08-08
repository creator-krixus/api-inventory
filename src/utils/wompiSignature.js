import crypto from "crypto";

/**
 * Verifica que un evento recibido en el webhook realmente venga de Wompi.
 * Wompi concatena, en orden: los valores de los campos listados en
 * signature.properties (extraídos del objeto "data"), luego el timestamp,
 * y luego el secreto de eventos. El resultado se compara (SHA256) contra
 * signature.checksum.
 */
export const verifyWompiSignature = (body) => {
  const { signature, timestamp, data } = body || {};

  if (!signature || !Array.isArray(signature.properties) || !timestamp || !data) {
    return false;
  }

  const concatenatedValues = signature.properties
    .map((path) => path.split(".").reduce((obj, key) => (obj ? obj[key] : undefined), data))
    .join("");

  const stringToHash = `${concatenatedValues}${timestamp}${process.env.WOMPI_EVENTS_SECRET}`;
  const checksum = crypto.createHash("sha256").update(stringToHash).digest("hex");

  return checksum === signature.checksum;
};

export default { verifyWompiSignature };