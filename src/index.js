import express from 'express'
import router from './routes/product.routes.js'
import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config()

const app = express();
const PORT = process.env.PORT || 2000;

// middleware
app.use(express.json())
app.use("/api/v1/products", router)

mongoose.connect(process.env.MONGO_DB_URI)
  .then(() => {
    console.log("DB conected")
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    });
  })
  .catch(err => console.error(err))

