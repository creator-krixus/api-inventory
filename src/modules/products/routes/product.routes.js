import express from 'express'
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct
} from "../controllers/product.controller.js";
const router = express.Router()


router.get("/", getProducts);

router.get("/:id", getProduct);

router.post("/", createProduct);

router.patch("/:id", updateProduct);

router.delete("/:id", deleteProduct);

//Creation documentation for register new product
/**
 * @swagger
 * components:
 *   schemas:
 *      products:
 *        type: object
 *        properties:
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
 *            -name
 *            -stock
 *            -price
 *        example:
 *           name: Cobre
 *           stock: 564
 *           price: 43000
 */


//Endpoint for create new product
/**
 * @swagger
 * /api/v1/products:
 *  post:
 *      summary: Create new product
 *      tags: [Products]
 *      requestBody:
 *          required: true
 *          content:
 *              application/json:
 *                  schema:
 *                      type: object
 *                      $ref: '#/components/schemas/products'
 *      responses:
 *          200:
 *              description: New product create!
 */

//Endpoint get all products
/**
 * @swagger
 * /api/v1/products:
 *  get:
 *      summary: Return all products
 *      tags: [Products]
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
 *      summary: Update a product
 *      tags: [Products]
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
 *                      $ref: '#/components/schemas/products'
 *      responses:
 *          200:
 *              description: update product
 *              content:
 *                  application/json:
 *                      schema:
 *                          type: objet
 *                          $ref: '#/components/schemas/products'
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

export default router