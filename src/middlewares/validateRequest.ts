import { ZodError, ZodTypeAny } from 'zod';
import { NextFunction, Request, Response } from 'express';

export const validateRequest = (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(400).json({ message: 'Error de validación', errors: err.flatten() });
    }
    return next(err);
  }
};
