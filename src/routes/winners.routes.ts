import { Router } from 'express';
import { getLatestWinnersImageController } from '../controllers/winners.controller';
import { requireAuth } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @openapi
 * /winners-image:
 *   get:
 *     summary: Obtener imagen de ganadores
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Imagen de ganadores
 */
router.get('/', requireAuth, getLatestWinnersImageController);

export default router;
