import Product from "../models/product.models.js";

export const getAllProducts = async (organizationId) => {
  return await Product.find({
    organizationId,
  }).lean();
};

export const getProductById = async (id, organizationId) => {
  return await Product.findOne({
    _id: id,
    organizationId,
  }).lean();
};

export const createProduct = async (data) => {
  return await Product.create(data);
};

export const updateProduct = async (
  id,
  organizationId,
  data
) => {
  return await Product.findOneAndUpdate(
    {
      _id: id,
      organizationId,
    },
    data,
    {
      new: true,
      runValidators: true,
    }
  );
};

export const deleteProduct = async (
  id,
  organizationId
) => {
  return await Product.findOneAndDelete({
    _id: id,
    organizationId,
  });
};