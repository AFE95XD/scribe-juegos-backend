import { Router } from 'express';
import {
  createAdministrator,
  createTicketsExportController,
  deleteAdministrator,
  deleteWeeklyTicketsController,
  downloadTicket,
  downloadWeeklyTicketsController,
  getAdministrators,
  registeredUsers,
  usersCount,
  getTicketsExportStatusController,
  leaderboard,
  listTickets,
  updateConfig
} from '../controllers/admin.controller';
import { uploadWinnersImageController } from '../controllers/winners.controller';
import { requireAdmin, requireAuth, requireSuperAdmin } from '../middlewares/authMiddleware';
import { upload } from '../middlewares/uploadMiddleware';
import { validateRequest } from '../middlewares/validateRequest';
import { gameConfigRequestSchema } from '../schemas/game.schema';
import { z } from 'zod';

const createAdminSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6)
  })
});

const ticketExportSchema = z.object({
  body: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional()
  })
});

const router = Router();

/**
 * @openapi
 * /admin/leaderboard:
 *   get:
 *     summary: Ranking de puntajes
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha inicio (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha fin (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Lista de jugadores con puntaje acumulado
 */
router.get('/leaderboard', requireAuth, requireAdmin, leaderboard);
router.get('/registered-users', requireAuth, requireAdmin, registeredUsers);
router.get('/users/count', requireAuth, requireSuperAdmin, usersCount);

/**
 * @openapi
 * /admin/tickets:
 *   get:
 *     summary: Listar tickets con URLs firmadas
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tickets recientes con items y URL firmada
 */
router.get('/tickets', requireAuth, requireAdmin, listTickets);

/**
 * @openapi
 * /admin/config:
 *   put:
 *     summary: Actualizar configuración de juegos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/GameConfig'
 *     responses:
 *       200:
 *         description: Configuración actualizada
 *       400:
 *         description: Datos inválidos
 */
router.put('/config', requireAuth, requireAdmin, validateRequest(gameConfigRequestSchema), updateConfig);

/**
 * @openapi
 * /admin/administrators:
 *   get:
 *     summary: Listar administradores
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de administradores
 */
router.get('/administrators', requireAuth, requireAdmin, getAdministrators);

/**
 * @openapi
 * /admin/administrators:
 *   post:
 *     summary: Crear nuevo administrador
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Administrador creado
 *       400:
 *         description: Email ya existe
 */
router.post('/administrators', requireAuth, requireAdmin, validateRequest(createAdminSchema), createAdministrator);

/**
 * @openapi
 * /admin/winners-image:
 *   post:
 *     summary: Subir imagen de ganadores
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Imagen guardada
 */
router.post('/winners-image', requireAuth, requireAdmin, upload.single('file'), uploadWinnersImageController);

/**
 * @openapi
 * /admin/administrators/{id}:
 *   delete:
 *     summary: Eliminar administrador
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Administrador eliminado
 *       400:
 *         description: No puede eliminar su propia cuenta
 *       404:
 *         description: Administrador no encontrado
 */
router.delete('/administrators/:id', requireAuth, requireAdmin, deleteAdministrator);

/**
 * @openapi
 * /admin/tickets/{id}/download:
 *   delete:
 *     summary: Descargar ticket y eliminarlo de GCS y BD
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: URL de descarga generada, ticket eliminado
 *       404:
 *         description: Ticket no encontrado
 */
router.delete('/tickets/:id/download', requireAuth, requireSuperAdmin, downloadTicket);

/**
 * @openapi
 * /admin/tickets/download-weekly:
 *   get:
 *     summary: Descargar tickets de una semana específica (sin borrar)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weekOffset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 0=semana actual, -1=semana pasada, -2=hace 2 semanas, etc.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha inicio (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha fin (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: URLs firmadas de tickets generadas (válidas por 2 horas)
 */
router.get('/tickets/download-weekly', requireAuth, requireAdmin, downloadWeeklyTicketsController);

/**
 * @openapi
 * /admin/tickets/delete-weekly:
 *   delete:
 *     summary: Eliminar tickets de una semana específica de GCS y BD
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: weekOffset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 0=semana actual, -1=semana pasada, -2=hace 2 semanas, etc.
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha inicio (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha fin (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Tickets eliminados exitosamente
 */
router.delete('/tickets/delete-weekly', requireAuth, requireSuperAdmin, deleteWeeklyTicketsController);

/**
 * @openapi
 * /admin/tickets/exports:
 *   post:
 *     summary: Generar exportación ZIP de tickets por rango
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               startDate:
 *                 type: string
 *                 format: date
 *               endDate:
 *                 type: string
 *                 format: date
 *     responses:
 *       202:
 *         description: Exportación iniciada
 */
router.post('/tickets/exports', requireAuth, requireAdmin, validateRequest(ticketExportSchema), createTicketsExportController);

/**
 * @openapi
 * /admin/tickets/exports/{id}:
 *   get:
 *     summary: Obtener estado de exportación de tickets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Estado de exportación
 */
router.get('/tickets/exports/:id', requireAuth, requireAdmin, getTicketsExportStatusController);

export default router;
