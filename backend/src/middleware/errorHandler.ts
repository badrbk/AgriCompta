import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

function isPrismaError(err: unknown): err is { code: string; message: string } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as { code: unknown }).code === 'string' &&
    err.constructor.name === 'PrismaClientKnownRequestError'
  );
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Erreurs de validation Zod
  if (err instanceof ZodError) {
    const errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({ error: 'Données invalides', details: errors });
    return;
  }

  // Erreurs Prisma
  if (isPrismaError(err)) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'Cette valeur existe déjà (contrainte d\'unicité)' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Ressource introuvable' });
      return;
    }
    logger.error('Erreur Prisma:', { code: err.code, message: err.message });
    res.status(400).json({ error: 'Erreur base de données' });
    return;
  }

  // Erreurs applicatives
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  // Erreurs non gérées
  logger.error('Erreur non gérée:', err);
  res.status(500).json({ error: 'Erreur interne du serveur' });
};
