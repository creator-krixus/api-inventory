import mongoose from "mongoose";
import ApiError from "../../../utils/apiError.js";
import * as productService from "../services/product.service.js";

// Get all
export const getProducts = async (req, res, next) => {
  try {
    const products = await productService.getAllProducts(req.user.organizationId);

    res.status(200).json(products);

  } catch (error) {
    next(error);
  }
};

// Get by Id
export const getProduct = async (req, res, next) => {

  try {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid product id.");

    }

    const product = await productService.getProductById(id,
      req.user.organizationId);

    if (!product) {
      throw new ApiError(404, "Product not found.");

    }

    res.status(200).json(product);

  } catch (error) {
    next(error);
  }

};

// Create
export const createProduct = async (req, res, next) => {

  try {

    const product = await productService.createProduct({
      ...req.body,
      organizationId: req.user.organizationId,
    });

    res.status(201).json(product);

  } catch (error) {
    next(error);
  }

};

// Update
export const updateProduct = async (req, res, next) => {

  try {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid product id.");
    }

    const product = await productService.updateProduct(
      id,
      req.user.organizationId,
      req.body
    );

    if (!product) {
      throw new ApiError(404, "Product not found.");
    }

    res.status(200).json(product);

  } catch (error) {
    next(error);
  }

};

// Delete
export const deleteProduct = async (req, res, next) => {

  try {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid product id.");
    }

    const product = await productService.deleteProduct(id,
      req.user.organizationId);

    if (!product) {
      throw new ApiError(400, "Invalid product id.");
    }

    res.json({
      message: "Producto eliminado"
    });

  } catch (error) {
    next(error);
  }

};