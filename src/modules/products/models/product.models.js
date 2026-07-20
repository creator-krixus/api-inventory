// import mongoose from "mongoose";

// // schema
// const productSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true
//   },
//   stock: {
//     type: Number,
//     required: true
//   },
//   price: {
//     type: Number,
//     required: true
//   },
// },
//   {
//     timestamps: true,
//     versionKey: false
//   })

// const Product = new mongoose.model('product', productSchema)

// export default Product

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