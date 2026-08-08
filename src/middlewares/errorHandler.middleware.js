const errorHandler = (err, req, res, next) => {
  console.error(err);

  let status = err.status || 500;
  let message = err.message || "Internal server error.";

  if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors)
      .map(error => error.message)
      .join(", ");
  }

  if (err.name === "CastError") {
    status = 400;
    message = "Invalid resource id.";
  }

  if (err.code === 11000) {
    status = 409;

    // En índices compuestos (ej. {organizationId, reference}), el campo que
    // realmente le importa al usuario suele ser el que NO es organizationId.
    const fields = Object.keys(err.keyValue || {});
    const field = fields.find((f) => f !== "organizationId") || fields[0];

    message = `${field} already exists.`;
  }

  res.status(status).json({
    success: false,
    message,
  });
};

export default errorHandler;