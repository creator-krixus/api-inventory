import Product from "../models/product.models.js";
import Movement from "../models/movement.model.js";
import ApiError from "../../../utils/apiError.js";

export const getAllProducts = async (organizationId) => {
  return await Product.find({
    organizationId,
  }).lean();
};

export const countProducts = async (organizationId) => {
  return await Product.countDocuments({ organizationId });
};

export const getProductById = async (id, organizationId) => {
  return await Product.findOne({
    _id: id,
    organizationId,
  }).lean();
};

// Busca por el código/SKU en vez del _id de Mongo — útil cuando quien
// registra el ingreso solo conoce la referencia del producto, no su id.
export const getProductByReference = async (reference, organizationId) => {
  return await Product.findOne({
    reference: reference.trim().toUpperCase(),
    organizationId,
  });
};

export const createProduct = async (data) => {
  return await Product.create({
    ...data,
    reference: data.reference?.trim().toUpperCase(),
  });
};

export const updateProduct = async (
  id,
  organizationId,
  data
) => {
  const payload = { ...data };
  if (payload.reference) {
    payload.reference = payload.reference.trim().toUpperCase();
  }

  return await Product.findOneAndUpdate(
    {
      _id: id,
      organizationId,
    },
    payload,
    {
      returnDocument: "after",
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

// Registra un ingreso, salida o ajuste de stock sobre un producto existente
// y actualiza su cantidad de forma atómica, dejando registro en Movement.
// Busca el producto por _id (id) o por código/SKU (reference) — quien registra
// el movimiento no siempre conoce el _id de Mongo, así que reference es la
// forma más práctica de usarlo en el día a día.
//
// En movimientos "in", recalcula el costo promedio ponderado del producto:
//   nuevoCostoPromedio = ((stockAnterior * costoPromedioAnterior) + (cantidad * unitPrice)) / stockNuevo
export const registerMovement = async ({
  id,
  reference,
  organizationId,
  type,
  quantity,
  unitPrice,
  reason,
  createdBy,
}) => {
  const lookup = reference
    ? { reference: reference.trim().toUpperCase(), organizationId }
    : { _id: id, organizationId };

  const product = await Product.findOne(lookup);

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  const previousStock = product.stock;
  const previousAverageCost = product.averageCost || 0;
  let newStock = previousStock;
  let newAverageCost = previousAverageCost;

  if (type === "in") {
    if (unitPrice === undefined || unitPrice === null) {
      throw new ApiError(400, "unitPrice is required for 'in' movements.");
    }
    if (unitPrice < 0) {
      throw new ApiError(400, "unitPrice cannot be negative.");
    }

    newStock = previousStock + quantity;
    newAverageCost =
      (previousStock * previousAverageCost + quantity * unitPrice) / newStock;
  } else if (type === "out") {
    if (quantity > previousStock) {
      throw new ApiError(400, "Insufficient stock.");
    }
    newStock = previousStock - quantity;
    // El costo promedio no cambia al vender/sacar stock, solo al comprar.
  } else if (type === "adjustment") {
    newStock = quantity;
    // Un ajuste de conteo tampoco debería alterar el costo promedio.
  } else {
    throw new ApiError(400, "Invalid movement type.");
  }

  product.stock = newStock;
  product.averageCost = newAverageCost;
  await product.save();

  const movement = await Movement.create({
    organizationId,
    product: product._id,
    type,
    quantity,
    unitPrice: type === "in" ? unitPrice : undefined,
    reason,
    previousStock,
    newStock,
    previousAverageCost,
    newAverageCost,
    createdBy,
  });

  return { product, movement };
};

export const getProductMovements = async ({ id, reference, organizationId }) => {
  const lookup = reference
    ? { reference: reference.trim().toUpperCase(), organizationId }
    : { _id: id, organizationId };

  const product = await Product.findOne(lookup).lean();

  if (!product) {
    throw new ApiError(404, "Product not found.");
  }

  return await Movement.find({ product: product._id, organizationId })
    .sort({ createdAt: -1 })
    .lean();
};