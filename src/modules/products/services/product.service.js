import Product from "../models/product.models.js";

export const getAllProducts = async () => {
  return await Product.find().lean();
};

export const getProductById = async (id) => {
  return await Product.findById(id).lean();
};

export const createProduct = async (data) => {
  return await Product.create(data);
};

export const updateProduct = async (id, data) => {
  return await Product.findByIdAndUpdate(
    id,
    data,
    {
      new: true,
      runValidators: true
    }
  );
};

export const deleteProduct = async (id) => {
  return await Product.findByIdAndDelete(id);
};