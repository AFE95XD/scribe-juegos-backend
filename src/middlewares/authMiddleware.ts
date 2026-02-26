import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../config/prisma';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    isAdmin: boolean;
    isSuperAdmin: boolean;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  try {
    const token = header.substring(7);
    const payload = jwt.verify(token, env.jwtSecret) as { sub: string; isAdmin?: boolean; isSuperAdmin?: boolean };
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      return res.status(401).json({ message: 'Token inválido' });
    }
    req.user = { id: user.id, isAdmin: user.isAdmin, isSuperAdmin: user.isSuperAdmin };
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido' });
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: 'Se requiere acceso de administrador' });
  }
  return next();
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.isAdmin || !req.user?.isSuperAdmin) {
    return res.status(403).json({ message: 'Se requiere acceso de Super Administrador para configurar puntos' });
  }
  return next();
};
