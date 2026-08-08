import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },

    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
    },

    // Referencia única generada por nosotros (idempotencia con Wompi)
    reference: {
      type: String,
      required: true,
      unique: true,
    },

    wompiTransactionId: {
      type: String,
      default: null,
    },

    amountInCents: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "COP",
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "DECLINED", "VOIDED", "ERROR"],
      default: "PENDING",
    },

    kind: {
      type: String,
      enum: ["subscription_initial", "subscription_renewal"],
      default: "subscription_initial",
    },

    rawResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model("Transaction", transactionSchema);