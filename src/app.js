import express from "express";
import productModule from "./modules/products/routes/product.routes.js";
import authRoutes from "./modules/auth/routes/auth.routes.js";
import documents from "./config/documentsApi.js";

const app = express();

app.use(express.json());

app.use("/api/v1/products", productModule);
app.use("/api/v1/auth", authRoutes);

documents(app);

export default app;