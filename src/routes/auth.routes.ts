import { Router } from 'express';
import {
  login,
  me,
  register,
  verify,
  sendRecoveryCodeController,
  resetPasswordController,
  resendVerificationController
} from '../controllers/auth.controller';
import { validateRequest } from '../middlewares/validateRequest';
import {
  loginSchema,
  registerSchema,
  sendRecoverySchema,
  resetPasswordSchema,
  resendVerificationSchema
} from '../schemas/auth.schema';
import { authLimiter, resendVerificationLimiter } from '../config/rateLimit';
import { requireAuth } from '../middlewares/authMiddleware';

const router = Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Usuario creado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VerificationLinkResponse'
 *       409:
 *         description: Ya existe un usuario con el mismo email o teléfono
 */
router.post('/register', authLimiter, resendVerificationLimiter, validateRequest(registerSchema), register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Retorna JWT y datos básicos del usuario
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', authLimiter, validateRequest(loginSchema), login);

router.post(
  '/resend-verification',
  authLimiter,
  resendVerificationLimiter,
  validateRequest(resendVerificationSchema),
  resendVerificationController
);

/**
 * @openapi
 * /auth/verify/{token}:
 *   get:
 *     summary: Marcar usuario como verificado usando token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuario verificado
 *       400:
 *         description: Token invケlido
 */
router.get('/verify/:token', verify);

/**
 * @openapi
 * /auth/send-recovery-code:
 *   post:
 *     summary: Enviar enlace de recuperación de contraseña por email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               emailOrPhone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Enlace enviado por Email
 *       404:
 *         description: Usuario no encontrado
 */
router.post('/send-recovery-code', authLimiter, validateRequest(sendRecoverySchema), sendRecoveryCodeController);

/**
 * @openapi
 * /auth/reset-password/{token}:
 *   post:
 *     summary: Restablecer contraseña con token
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 *       400:
 *         description: Token inválido o expirado
 */
router.post('/reset-password/:token', authLimiter, validateRequest(resetPasswordSchema), resetPasswordController);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: Obtener perfil del usuario autenticado
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario actual
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: No autorizado
 */
router.get('/me', requireAuth, me);

export default router;
