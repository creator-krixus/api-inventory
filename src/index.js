import express from 'express'
import router from './routes/routes.js'
import dotenv from 'dotenv'
dotenv.config()

const app = express();
const PORT = process.env.PORT || 2000;

// middleware
app.use("/", router)

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});