import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required."],
      unique: true,
      index: true,
    },

    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
      default: null, // null mientras está en período de prueba (trial)
    },

    status: {
      type: String,
      enum: ["trialing", "active", "past_due", "canceled"],
      default: "trialing",
    },

    // Fuente de pago tokenizada en Wompi (permite cobrar sin pedir la tarjeta de nuevo)
    wompiPaymentSourceId: {
      type: Number,
      default: null,
    },

    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },

    currentPeriodStart: {
      type: Date,
      default: Date.now,
    },

    currentPeriodEnd: {
      type: Date,
      required: true,
    },

    // Si es true, no se renovará automáticamente al terminar el período actual
    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },

    lastPaymentError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model("Subscription", subscriptionSchema);