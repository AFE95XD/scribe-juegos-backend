import { Router } from 'express';
import authRoutes from './auth.routes';
import ticketRoutes from './ticket.routes';
import gameRoutes from './game.routes';
import adminRoutes from './admin.routes';
import prizeRoutes from './prize.routes';
import winnersRoutes from './winners.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tickets', ticketRoutes);
router.use('/games', gameRoutes);
router.use('/admin', adminRoutes);
router.use('/prizes', prizeRoutes);
router.use('/winners-image', winnersRoutes);

export default router;
