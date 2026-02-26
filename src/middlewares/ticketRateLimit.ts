import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';
import { env } from '../config/env';
import { AuthRequest } from './authMiddleware';

export const ticketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.rateLimitTicketMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const authReq = req as AuthRequest;
    if (authReq.user?.id) return authReq.user.id;
    // Use helper to properly normalize IPv6
    return ipKeyGenerator(req.ip ?? req.socket?.remoteAddress ?? 'unknown');
  },
  handler: (_req: Request, res: Response) => {
    res.status(429).json({ message: 'Has alcanzado el límite de envíos. Inténtalo más tarde.' });
  }
});
