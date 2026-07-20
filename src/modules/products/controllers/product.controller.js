import mongoose from "mongoose";
import * as productService from "../services/product.service.js";

// Get all
export const getProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts(req.user.organizationId);

    res.json(products);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }
};

// Get by Id
export const getProduct = async (req, res) => {

  try {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {

      return res.status(400).json({
        message: "ID inválido"
      });

    }

    const product = await productService.getProductById(id,
      req.user.organizationId);

    if (!product) {

      return res.status(404).json({
        message: "Producto no encontrado"
      });

    }

    res.json(product);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

// Create
export const createProduct = async (req, res) => {

  try {

    const product = await productService.createProduct({
      ...req.body,
      organizationId: req.user.organizationId,
    });

    res.status(201).json(product);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

// Update
export const updateProduct = async (req, res) => {

  try {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {

      return res.status(400).json({
        message: "ID inválido"
      });

    }

    const product = await productService.updateProduct(
      id,
      req.user.organizationId,
      req.body
    );

    if (!product) {

      return res.status(404).json({
        message: "Producto no encontrado"
      });

    }

    res.json(product);

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};

// Delete
export const deleteProduct = async (req, res) => {

  try {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {

      return res.status(400).json({
        message: "ID inválido"
      });

    }

    const product = await productService.deleteProduct(id,
      req.user.organizationId);

    if (!product) {

      return res.status(404).json({
        message: "Producto no encontrado"
      });

    }

    res.json({
      message: "Producto eliminado"
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

};