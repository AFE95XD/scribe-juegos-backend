// ⚠️ RATE LIMIT DESHABILITADO PARA PRUEBAS ⚠️
// ⚠️ DESCOMENTAR ANTES DE SUBIR A PRODUCCIÓN ⚠️
// Ver archivo: RATE_LIMIT_DESHABILITADO.md en la raíz del proyecto

import { Request, Response, NextFunction } from 'express';
// import rateLimit from 'express-rate-limit';
// import { env } from './env';

// RATE LIMIT COMENTADO - Middleware dummy que no hace nada
export const generalLimiter = (req: Request, res: Response, next: NextFunction) => {
  next();
};

export const authLimiter = (req: Request, res: Response, next: NextFunction) => {
  next();
};

export const resendVerificationLimiter = (req: Request, res: Response, next: NextFunction) => {
  next();
};

// ============================================================
// CÓDIGO ORIGINAL COMENTADO (Descomentar para producción)
// ============================================================
/*
import rateLimit from 'express-rate-limit';
import { env } from './env';

export const generalLimiter = rateLimit({
  windowMs: env.rateLimitGeneralWindow * 60 * 1000,
  max: env.rateLimitGeneralMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiadas solicitudes, por favor intenta más tarde.'
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.rateLimitAuthMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiados intentos de autenticación, por favor intenta más tarde.'
});

export const resendVerificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 3, // Máximo 3 intentos de registro/reenvío
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiados intentos de reenvío. Intenta de nuevo en 15 minutos.',
  keyGenerator: (req) => {
    // Limitar por email (no por IP)
    return req.body.email || req.ip;
  }
});
*/
