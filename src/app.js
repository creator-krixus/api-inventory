import express from "express";
import productModule from "./modules/products/routes/product.routes.js";
import authRoutes from "./modules/auth/routes/auth.routes.js";
import errorHandler from "./middlewares/errorHandler.middleware.js";
import documents from "./config/documentsApi.js";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:5173"
  ],
  credentials: true
}));

//Routes
app.use("/api/v1/products", productModule);
app.use("/api/v1/auth", authRoutes);

//Middleware handler errors
app.use(errorHandler);

//Documentation swagger
documents(app);

export default app;