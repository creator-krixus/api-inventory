import express from "express";
import productModule from "./modules/products/routes/product.routes.js";
import authRoutes from "./modules/auth/routes/auth.routes.js";
import subscriptionRoutes from "./modules/subscriptions/routes/subscription.routes.js";
import agentRoutes from "./modules/agent/routes/agent.routes.js";
// import whatsappRoutes from "./modules/whatsapp/routes/whatsapp.routes.js";
import errorHandler from "./middlewares/errorHandler.middleware.js";
import documents from "./config/documentsApi.js";
import cors from "cors";

const app = express();

// Límite subido de 100kb (default de Express) a 15mb: las fotos/PDFs de
// facturas viajan en base64 dentro del JSON (~33% más grandes que el
// archivo original), y el límite duro de la API de Anthropic ya es 5MB
// para imágenes / 32MB para PDFs — dejamos margen razonable acá.
app.use(express.json({ limit: "15mb" }));
// Twilio manda los webhooks como application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: false }));
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
// app.use("/api/v1/whatsapp", whatsappRoutes);

//Middleware handler errors
app.use(errorHandler);

//Documentation swagger
documents(app);

export default app;