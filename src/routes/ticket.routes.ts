import { Router } from "express";
import { uploadTicket } from "../controllers/ticket.controller";
import { requireAuth } from "../middlewares/authMiddleware";
import { ticketLimiter } from "../middlewares/ticketRateLimit";
import { upload } from "../middlewares/uploadMiddleware";

const router = Router();

/**
 * @openapi
 * /tickets:
 *   post:
 *     summary: Subir ticket y calcular Créditos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - state
 *               - city
 *               - store
 *               - items
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               state:
 *                 type: string
 *               city:
 *                 type: string
 *               store:
 *                 type: string
 *               items:
 *                 description: JSON string con arreglo de items
 *                 type: string
 *                 example: '[{"line":"PRO","pieces":2,"amount":100}]'
 *     responses:
 *       201:
 *         description: Ticket registrado y Créditos acreditadas
 *       401:
 *         description: No autorizado
 *       429:
 *         description: Límite de subida de tickets excedido
 */
router.post(
  "/",
  requireAuth,
  ticketLimiter,
  upload.single("file"),
  uploadTicket,
);

export default router;
