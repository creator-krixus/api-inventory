import mongoose from "mongoose";

// schema
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  stock: {
    type: Number,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
})

const Product = new mongoose.model('product', productSchema)

export default Product