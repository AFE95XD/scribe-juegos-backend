import { Router } from "express";
import {
  fetchConfig,
  start,
  submitEvent,
  submit,
  totalScore,
} from "../controllers/game.controller";
import { requireAuth } from "../middlewares/authMiddleware";
import { validateRequest } from "../middlewares/validateRequest";
import { gameEventSchema, gameFinishSchema, gameStartSchema } from "../schemas/game.schema";

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
 * /games/event:
 *   post:
 *     summary: Registrar evento valido de partida y calcular puntaje en servidor
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GameEventRequest'
 *     responses:
 *       200:
 *         description: Evento aceptado y puntaje actualizado
 *       401:
 *         description: No autorizado
 */
router.post("/event", requireAuth, validateRequest(gameEventSchema), submitEvent);

/**
 * @openapi
 * /games/score:
 *   post:
 *     summary: Finalizar partida y devolver puntaje calculado por servidor
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GameFinishRequest'
 *     responses:
 *       200:
 *         description: Partida finalizada
 *       401:
 *         description: No autorizado
 */
router.post("/score", requireAuth, validateRequest(gameFinishSchema), submit);

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
