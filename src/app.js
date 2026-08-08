import express from "express";
import productModule from "./modules/products/routes/product.routes.js";
import authRoutes from "./modules/auth/routes/auth.routes.js";
import subscriptionRoutes from "./modules/subscriptions/routes/subscription.routes.js";
import errorHandler from "./middlewares/errorHandler.middleware.js";
import agentRoutes from "./modules/agent/routes/agent.routes.js"
import documents from "./config/documentsApi.js";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://inventory-frontend-pi-seven.vercel.app"
  ],
  credentials: true
}));

//Routes
app.use("/api/v1/products", productModule);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/subscriptions", subscriptionRoutes);
app.use("/api/v1/agent", agentRoutes);

//Middleware handler errors
app.use(errorHandler);

//Documentation swagger
documents(app);

export default app;