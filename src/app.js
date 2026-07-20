import express from "express";
import router from "./routes/product.routes.js";
import documents from "./config/documentsApi.js";

const app = express();

app.use(express.json());

app.use("/api/v1/products", router);

documents(app);

export default app;