import express from 'express'
import product from '../models/models.js'
const router = express.Router()

router.get('/', (req, res) => {
  res.send('<h1>Hola Mundo desde la api👋</h1>');
});

router.get("/:id", (req, res) => {
  console.log("obtener objetop por id")
})

router.post('/', async (req, res) => {
  try {
    const { name, cant } = req.body
    const newProduct = new product({ name, cant })
    const savedProduct = await newProduct.save()
    res.status(201).json({ message: "Product created succesfully", product: savedProduct })
  } catch (error) {
    console.log(error)
  }

})

router.put("/:id", (req, res) => {
  console.log("Editar objeto")
})

router.delete("/:id", (req, res) => {
  console.log("Borrar un objeto por id")
})

export default router