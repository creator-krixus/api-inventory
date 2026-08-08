import express from 'express'
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  registerMovement,
  getProductMovements,
  getProductByReference,
  registerMovementByReference,
  getProductMovementsByReference
} from "../controllers/product.controller.js";
import authMiddleware from "../../auth/middlewares/auth.middleware.js";
// Agregar este middleware cuando se implemente los planes de pago va despues de autMiddleware
import subscriptionMiddleware from "../../subscriptions/middlewares/subscription.middleware.js";
const router = express.Router()


router.get("/", authMiddleware, getProducts);

router.get("/:id", authMiddleware, getProduct);

router.post("/", authMiddleware, createProduct);

router.patch("/:id", authMiddleware, updateProduct);

router.delete("/:id", authMiddleware, deleteProduct);

router.post("/:id/movements", authMiddleware, registerMovement);

router.get("/:id/movements", authMiddleware, getProductMovements);

// Variantes por código/SKU (reference) — para cuando no se conoce el _id de Mongo,
// que es el caso típico al recibir mercancía nueva en bodega.
router.get("/reference/:reference", authMiddleware, getProductByReference);

router.post(
  "/reference/:reference/movements",
  authMiddleware,
  registerMovementByReference
);

router.get(
  "/reference/:reference/movements",
  authMiddleware,
  getProductMovementsByReference
);

//Creation documentation for register new product
/**
 * @swagger
 * components:
 *   schemas:
 *      products:
 *        type: object
 *        properties:
 *          reference:
 *              type: string
 *              description: Código/SKU único del producto dentro de la organización
 *          name:
 *              type: string
 *              description: Nombre de usuario nuevo
 *          stock:
 *              type: number
 *              description: Cantidad
 *          price:
 *              type: number
 *              description: Valor
 *        required:
 *            -reference
 *            -name
 *            -stock
 *            -price
 *        example:
 *           reference: COB-001
 *           name: Cobre
 *           stock: 564
 *           price: 43000
 */


//Endpoint for create new product
/**
 * @swagger
 * /api/v1/products:
 *   post:
 *     summary: Create new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/products'
 *     responses:
 *       201:
 *         description: New product created successfully.
 *       401:
 *         description: Unauthorized.
 */

//Endpoint get all products
/**
 * @swagger
 * /api/v1/products:
 *  get:
 *      summary: Return all products
 *      tags: [Products]
 *      security:
 *       - bearerAuth: []
 *      responses:
 *          200:
 *              description: All products
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: array
 *                          items:
 *                              $ref: '#/components/schemas/products'
 */

//Endpoint get product by Id
/**
 * @swagger
 * /api/v1/products/{id}:
 *  get:
 *      summary: Return a product for identifier unique
 *      tags: [Products]
 *      security:
 *       - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: id
 *          schema:
 *              type: string
 *          required: true
 *          description: A product
 *      responses:
 *          200:
 *              description: A product
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: object
 *                          $ref: '#/components/schemas/products'
 *          404:
 *              description: Product not found
 */

//Endpoint update product 
/**
 * @swagger
 * /api/v1/products/{id}:
 *  patch:
 *      summary: Update a product's name, price or reference (NOT stock — use /movements for that)
 *      tags: [Products]
 *      security:
 *       - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: id
 *          schema:
 *              type: string
 *          required: true
 *          description: Update a product
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      properties:
 *                          reference:
 *                              type: string
 *                          name:
 *                              type: string
 *                          price:
 *                              type: number
 *                      example:
 *                          name: Cobre premium
 *                          price: 45000
 *      responses:
 *          200:
 *              description: update product
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: objet
 *                          $ref: '#/components/schemas/products'
 *          400:
 *              description: Stock cannot be updated directly (use /movements)
 *          404:
 *              description: Product not found
 */

//Endpoint delete product
/**
 * @swagger
 * /api/v1/products/{id}:
 *  delete:
 *      summary: Delete a product
 *      tags: [Products]
 *      security:
 *       - bearerAuth: []
 *      parameters:
 *        - in: path
 *          name: id
 *          schema:
 *              type: string
 *          required: true
 *          description: Delete a product
 *      responses:
 *          200:
 *              description: Delete product
 *          404:
 *              description: Product not found
 */

/**
 * @swagger
 * components:
 *   schemas:
 *      Movement:
 *        type: object
 *        properties:
 *          type:
 *              type: string
 *              enum: [in, out, adjustment]
 *              description: Tipo de movimiento (ingreso, salida o ajuste manual)
 *          quantity:
 *              type: number
 *              description: Cantidad del movimiento (en "adjustment" es el nuevo stock total)
 *          unitPrice:
 *              type: number
 *              description: Costo unitario de compra. Obligatorio cuando type es "in"; se usa para recalcular el costo promedio ponderado del producto.
 *          reason:
 *              type: string
 *              description: Motivo del movimiento (ej. "Compra a proveedor")
 *        required:
 *            -type
 *            -quantity
 *        example:
 *           type: in
 *           quantity: 50
 *           unitPrice: 32000
 *           reason: Compra a proveedor
 */


//Endpoint registrar un movimiento de stock (ingreso/salida/ajuste)
/**
 * @swagger
 * /api/v1/products/{id}/movements:
 *   post:
 *     summary: Register a stock movement (in/out/adjustment) for an existing product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *             type: string
 *         required: true
 *         description: Product id
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Movement'
 *     responses:
 *       201:
 *         description: Movement registered, product stock updated.
 *       400:
 *         description: Insufficient stock or invalid movement type.
 *       404:
 *         description: Product not found.
 */

//Endpoint historial de movimientos de un producto
/**
 * @swagger
 * /api/v1/products/{id}/movements:
 *   get:
 *     summary: Get the stock movement history of a product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *             type: string
 *         required: true
 *         description: Product id
 *     responses:
 *       200:
 *         description: List of movements, most recent first.
 *       404:
 *         description: Product not found.
 */

//Endpoints por reference (SKU) — no requieren conocer el _id de Mongo
/**
 * @swagger
 * /api/v1/products/reference/{reference}:
 *   get:
 *     summary: Get a product by its reference/SKU
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         schema:
 *             type: string
 *         required: true
 *         example: COB-001
 *     responses:
 *       200:
 *         description: A product
 *       404:
 *         description: Product not found
 */

/**
 * @swagger
 * /api/v1/products/reference/{reference}/movements:
 *   post:
 *     summary: Register a stock movement using the product's reference/SKU instead of its Mongo id
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         schema:
 *             type: string
 *         required: true
 *         example: COB-001
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Movement'
 *     responses:
 *       201:
 *         description: Movement registered, product stock updated.
 *       404:
 *         description: Product not found.
 */

/**
 * @swagger
 * /api/v1/products/reference/{reference}/movements:
 *   get:
 *     summary: Get the stock movement history of a product using its reference/SKU
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reference
 *         schema:
 *             type: string
 *         required: true
 *         example: COB-001
 *     responses:
 *       200:
 *         description: List of movements, most recent first.
 *       404:
 *         description: Product not found.
 */
export default router