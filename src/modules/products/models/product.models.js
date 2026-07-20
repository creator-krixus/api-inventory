import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization is required."],
      index: true,
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

export default mongoose.model("Product", productSchema);