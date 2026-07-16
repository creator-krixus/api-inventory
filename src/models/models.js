import mongoose from "mongoose";

// schema
const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  cant: {
    type: Number,
    required: true
  }
})

const product = new mongoose.model('product', productSchema)

export default product