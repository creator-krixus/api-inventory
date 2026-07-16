import express from 'express'
const router = express.Router()

router.get('/', (req, res) => {
  res.send('<h1>Hola Mundo desde la api👋</h1>');
});

router.get("/:id", (req, res) => {
  console.log("obtener objetop por id")
})

router.post('/', (req, res) => {
  res.send('<h1>Creando desde la api👋</h1>');
  console.log("Crear nuevo objeto")
})

router.put("/:id", (req, res) => {
  console.log("Editar objeto")
})

router.delete("/:id", (req, res) => {
  console.log("Borrar un objeto por id")
})

export default router