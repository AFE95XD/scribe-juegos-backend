import { Router } from "express";
import {
  fetchConfig,
  start,
  submit,
  totalScore,
} from "../controllers/game.controller";
import { requireAuth } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import { gameScoreSchema, gameStartSchema } from "../schemas/game.schema";

const router = Router();

/**
 * @openapi
 * /games/config:
 *   get:
 *     summary: Obtener configuración actual del juego
 *     responses:
 *       200:
 *         description: Configuración activa
 */
router.get("/config", fetchConfig);

/**
 * @openapi
 * /games/start:
 *   post:
 *     summary: Iniciar partida (resta 1 moneda)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GameStartRequest'
 *     responses:
 *       200:
 *         description: Partida iniciada
 *       400:
 *         description: Créditos insuficientes
 *       401:
 *         description: No autorizado
 */
router.post("/start", requireAuth, validateRequest(gameStartSchema), start);

/**
 * @openapi
 * /games/score:
 *   post:
 *     summary: Guardar puntaje de partida
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GameScoreRequest'
 *     responses:
 *       200:
 *         description: Puntaje guardado
 *       401:
 *         description: No autorizado
 */
router.post("/score", requireAuth, validateRequest(gameScoreSchema), submit);

/**
 * @openapi
 * /games/score/total:
 *   get:
 *     summary: Obtener el puntaje acumulado del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Puntaje total
 *       401:
 *         description: No autorizado
 */
router.get("/score/total", requireAuth, totalScore);

export default router;
