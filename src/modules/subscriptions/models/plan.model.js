import mongoose from "mongoose";

const planSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Plan name is required."],
      trim: true,
    },

    slug: {
      type: String,
      required: [true, "Plan slug is required."],
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Precio en centavos de COP (ej. 4990000 = $49.900 COP), como lo exige Wompi.
    priceInCents: {
      type: Number,
      required: [true, "Price is required."],
      min: 0,
    },

    interval: {
      type: String,
      enum: ["month", "year"],
      default: "month",
    },

    limits: {
      maxProducts: { type: Number, default: 100 },
      maxUsers: { type: Number, default: 3 },
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

export default mongoose.model("Plan", planSchema);