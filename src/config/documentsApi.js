import dotenv from "dotenv";
dotenv.config();

import basicAuth from "express-basic-auth";
import swaggerUI from 'swagger-ui-express';
import swaggerJsDocs from 'swagger-jsdoc';
const swaggerSpec = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Inventory API",
      version: "1.0.0"
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Servidor local"
      },
      {
        url: "https://api-inventory-v7ca.onrender.com",
        description: "Servidor de producción"
      }
    ]
  },
  apis: ['./src/config/documentsApi.js']
}

const documents = (app) => {
  app.use(
    "/api/v1/docs",
    basicAuth({
      users: {
        admin: process.env.DOCS_PASSWORD
      },
      challenge: true
    }),
    swaggerUI.serve,
    swaggerUI.setup(swaggerJsDocs(swaggerSpec))
  );
};

export default documents;


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