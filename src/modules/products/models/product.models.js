import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required."],
      index: true,
    },

    // Código/SKU del producto. Es lo que identifica al producto de forma
    // estable para poder seguir registrando ingresos sobre el mismo item
    // en vez de crear un producto nuevo cada vez que llega mercancía.
    reference: {
      type: String,
      required: [true, "Reference is required."],
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: [true, "Product name is required."],
      trim: true,
    },

    stock: {
      type: Number,
      required: [true, "Stock is required."],
      min: 0,
      default: 0,
    },

    // Costo promedio ponderado de compra del stock actual (distinto del
    // "price" de venta). Se recalcula automáticamente en cada ingreso.
    averageCost: {
      type: Number,
      min: 0,
      default: 0,
    },

    price: {
      type: Number,
      required: [true, "Price is required."],
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// La referencia debe ser única, pero solo dentro de la misma organización:
// dos organizaciones distintas sí pueden usar el mismo código (ej. "REF-001").
productSchema.index({ organizationId: 1, reference: 1 }, { unique: true });

export default mongoose.model("Product", productSchema);