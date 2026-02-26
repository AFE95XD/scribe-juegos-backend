import { Router } from 'express';
import multer from 'multer';
import prizeController from '../controllers/prize.controller';
import { requireAuth, requireAdmin } from '../middlewares/authMiddleware';

const router = Router();

// Configurar multer para carga de archivos CSV
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    // Aceptar solo archivos CSV
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos CSV'));
    }
  },
});

// ============ RUTAS PÚBLICAS (con auth) ============

/**
 * @route GET /api/prizes
 * @desc Obtener todos los premios activos (filtrados por fecha de desbloqueo)
 * @access Protegido (requiere autenticación)
 */
router.get('/', requireAuth, prizeController.getActivePrizes.bind(prizeController));

/**
 * @route GET /api/prizes/my-redemptions
 * @desc Obtener canjes del usuario actual
 * @access Protegido (requiere autenticación)
 * NOTA: Esta ruta DEBE ir ANTES de /:id para evitar conflictos
 */
router.get('/my-redemptions', requireAuth, prizeController.getMyRedemptions.bind(prizeController));

/**
 * @route GET /api/prizes/:id
 * @desc Obtener un premio específico por ID
 * @access Protegido (requiere autenticación)
 */
router.get('/:id', requireAuth, prizeController.getPrizeById.bind(prizeController));

/**
 * @route POST /api/prizes/:id/redeem
 * @desc Canjear un premio
 * @access Protegido (requiere autenticación)
 */
router.post('/:id/redeem', requireAuth, prizeController.redeemPrize.bind(prizeController));

// ============ RUTAS ADMIN ============

/**
 * @route GET /api/prizes/admin/all
 * @desc Obtener todos los premios (sin filtros)
 * @access Admin only
 */
router.get('/admin/all', requireAuth, requireAdmin, prizeController.getAllPrizesAdmin.bind(prizeController));

/**
 * @route POST /api/prizes/admin/create
 * @desc Crear nuevo premio
 * @access Admin only
 */
router.post('/admin/create', requireAuth, requireAdmin, prizeController.createPrize.bind(prizeController));

/**
 * @route PUT /api/prizes/admin/:id
 * @desc Actualizar premio existente
 * @access Admin only
 */
router.put('/admin/:id', requireAuth, requireAdmin, prizeController.updatePrize.bind(prizeController));

/**
 * @route DELETE /api/prizes/admin/:id
 * @desc Eliminar premio
 * @access Admin only
 */
router.delete('/admin/:id', requireAuth, requireAdmin, prizeController.deletePrize.bind(prizeController));

/**
 * @route GET /api/prizes/admin/redemptions
 * @desc Obtener todos los canjes
 * @access Admin only
 */
router.get('/admin/redemptions', requireAuth, requireAdmin, prizeController.getAllRedemptions.bind(prizeController));

/**
 * @route PATCH /api/prizes/admin/redemptions/:id
 * @desc Actualizar estado de canje
 * @access Admin only
 */
router.patch('/admin/redemptions/:id', requireAuth, requireAdmin, prizeController.updateRedemptionStatus.bind(prizeController));

/**
 * @route POST /api/prizes/admin/upload-csv
 * @desc Importar premios desde archivo CSV
 * @access Admin only
 */
router.post('/admin/upload-csv', requireAuth, requireAdmin, upload.single('file'), prizeController.uploadCSV.bind(prizeController));

export default router;
