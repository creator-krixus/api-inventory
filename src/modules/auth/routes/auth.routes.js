import express from "express";

import authController from "../controllers/auth.controller.js";
// import authMiddleware from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *      Authentication:
 *        type: object
 *        properties:
 *          organizationName:
 *              type: string
 *              description: Nombre de la organizacion
 *          name:
 *              type: string
 *              description: Nombre del usuario
 *          email:
 *              type: string
 *              description: Correo valido
 *          password:
 *              type: string
 *              description: Clave secreta
 *        required:
 *            -organizationName
 *            -name
 *            -email
 *            -password
 *        example:
 *           organizationName: Softinkra
 *           name: Wilson Rueda
 *           email: wilson@gmail.com
 *           password: Password123
 */

/**
 * @swagger
 * /api/v1/auth/signup:
 *   post:
 *     summary: Register a new organization and administrator.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationName
 *               - name
 *               - email
 *               - password
 *             properties:
 *               organizationName:
 *                 type: string
 *                 example: Softinkra
 *               name:
 *                 type: string
 *                 example: Wilson Rueda
 *               email:
 *                 type: string
 *                 example: wilson@email.com
 *               password:
 *                 type: string
 *                 example: Password123*
 *     responses:
 *       201:
 *         description: User registered successfully.
 */
router.post("/signup", authController.signup);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login user.
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: wilson@email.com
 *               password:
 *                 type: string
 *                 example: Password123*
 *     responses:
 *       200:
 *         description: Login successful.
 *       401:
 *         description: Invalid credentials.
 */
router.post("/login", authController.login);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get authenticated user information.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user information.
 *       401:
 *         description: Unauthorized.
 */
// router.get("/me", authMiddleware, authController.getMe);

export default router;