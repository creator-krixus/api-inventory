import mongoose from "mongoose";

const movementSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: ["in", "out", "adjustment"],
      required: true,
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required."],
      min: [1, "Quantity must be greater than 0."],
    },

    reason: {
      type: String,
      trim: true,
      default: "",
    },

    previousStock: {
      type: Number,
      required: true,
    },

    newStock: {
      type: Number,
      required: true,
    },

    // Costo unitario de compra — solo aplica (y es obligatorio) en movimientos "in".
    // Con esto se recalcula el costo promedio ponderado del producto.
    unitPrice: {
      type: Number,
      min: 0,
      required: function () {
        return this.type === "in";
      },
    },

    // Costo promedio del producto antes/después de este movimiento (auditoría/trazabilidad)
    previousAverageCost: {
      type: Number,
      default: 0,
    },

    newAverageCost: {
      type: Number,
      default: 0,
    },

    // Quién registró el movimiento
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model("Movement", movementSchema);