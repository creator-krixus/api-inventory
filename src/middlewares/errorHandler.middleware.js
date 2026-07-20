// const errorHandler = (err, req, res, next) => {
//   console.error(err);

//   let status = err.status || 500;
//   let message = err.message || "Internal server error.";

//   // Errores de validación de Mongoose
//   if (err.name === "ValidationError") {
//     status = 400;

//     message = Object.values(err.errors)
//       .map(error => error.message)
//       .join(", ");
//   }

//   // Error de ObjectId inválido
//   if (err.name === "CastError") {
//     status = 400;
//     message = "Invalid resource id.";
//   }

//   // Error por índice único
//   if (err.code === 11000) {
//     status = 409;

//     const field = Object.keys(err.keyValue)[0];

//     message = `${field} already exists.`;
//   }

//   res.status(status).json({
//     success: false,
//     message,
//   });
// };

// export default errorHandler;

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

    const field = Object.keys(err.keyValue)[0];

    message = `${field} already exists.`;
  }

  res.status(status).json({
    success: false,
    message,
  });
};

export default errorHandler;