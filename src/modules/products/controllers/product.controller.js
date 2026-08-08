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

    const maxProducts =
      req.subscription?.plan?.limits?.maxProducts ??
      Number(process.env.TRIAL_MAX_PRODUCTS || 20);

    const currentCount = await productService.countProducts(req.user.organizationId);

    if (currentCount >= maxProducts) {
      throw new ApiError(
        403,
        `Product limit reached for your plan (${maxProducts}). Upgrade your plan to add more.`
      );
    }

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

    if (req.body.stock !== undefined) {
      throw new ApiError(
        400,
        "Stock cannot be updated directly. Use POST /products/:id/movements to register an in, out, or adjustment."
      );
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

// Registrar un ingreso, salida o ajuste de stock sobre un producto existente
// (usa la referencia/SKU para acumular cantidades en vez de crear duplicados)
export const registerMovement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { type, quantity, unitPrice, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid product id.");
    }

    if (!type || !quantity) {
      throw new ApiError(400, "type and quantity are required.");
    }

    const result = await productService.registerMovement({
      id,
      organizationId: req.user.organizationId,
      type,
      quantity: Number(quantity),
      unitPrice: unitPrice !== undefined ? Number(unitPrice) : undefined,
      reason,
      createdBy: req.user.id,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// Historial de movimientos de un producto
export const getProductMovements = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid product id.");
    }

    const movements = await productService.getProductMovements(id, req.user.organizationId);

    res.status(200).json(movements);
  } catch (error) {
    next(error);
  }
};

// Registrar un movimiento buscando el producto por reference en vez de _id
export const registerMovementByReference = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const { type, quantity, unitPrice, reason } = req.body;

    if (!type || !quantity) {
      throw new ApiError(400, "type and quantity are required.");
    }

    const result = await productService.registerMovement({
      reference,
      organizationId: req.user.organizationId,
      type,
      quantity: Number(quantity),
      unitPrice: unitPrice !== undefined ? Number(unitPrice) : undefined,
      reason,
      createdBy: req.user.id,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

// Get by reference (código/SKU) — útil cuando no se conoce el _id de Mongo
export const getProductByReference = async (req, res, next) => {
  try {
    const { reference } = req.params;

    const product = await productService.getProductByReference(reference, req.user.organizationId);

    if (!product) {
      throw new ApiError(404, "Product not found.");
    }

    res.status(200).json(product);
  } catch (error) {
    next(error);
  }
};

export const getProductMovementsByReference = async (req, res, next) => {
  try {
    const { reference } = req.params;

    const movements = await productService.getProductMovements({
      reference,
      organizationId: req.user.organizationId,
    });

    res.status(200).json(movements);
  } catch (error) {
    next(error);
  }
};