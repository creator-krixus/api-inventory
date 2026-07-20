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
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT"
        }
      }
    }
  },
  apis: ["./src/modules/**/*.routes.js"]
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