import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../utils/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

const updateSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['ADMIN', 'ASSOCIATE', 'ACCOUNTANT', 'OBSERVER']).optional(),
});

// Création d'un utilisateur par un admin
router.post('/', requireAdmin, async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email('Email invalide'),
      password: z.string().min(8, 'Minimum 8 caractères'),
      firstName: z.string().min(1, 'Prénom requis'),
      lastName: z.string().min(1, 'Nom requis'),
      role: z.enum(['ADMIN', 'ASSOCIATE', 'ACCOUNTANT', 'OBSERVER']).default('ASSOCIATE'),
    });
    const data = schema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new AppError('Cet email est déjà utilisé', 409);

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: { email: data.email, passwordHash, firstName: data.firstName, lastName: data.lastName, role: data.role },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true },
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/', requireAdmin, async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, lastLogin: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    // Un utilisateur ne peut voir que son propre profil, sauf admin
    if (req.user?.role !== 'ADMIN' && req.user?.userId !== id) {
      throw new AppError('Accès refusé', 403);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, lastLogin: true },
    });

    if (!user) throw new AppError('Utilisateur introuvable', 404);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    if (req.user?.role !== 'ADMIN' && req.user?.userId !== id) {
      throw new AppError('Accès refusé', 403);
    }

    const data = updateSchema.parse(req.body);
    const updateData: Record<string, unknown> = { ...data };

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
      delete updateData.password;
    }

    // Seul un admin peut changer le rôle
    if (data.role && req.user?.role !== 'ADMIN') {
      delete updateData.role;
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: { id: true, email: true, firstName: true, lastName: true, role: true, updatedAt: true },
    });

    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Changement de mot de passe (route dédiée avec vérification du mot de passe actuel)
router.put('/:id/password', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    if (req.user?.role !== 'ADMIN' && req.user?.userId !== id) {
      throw new AppError('Accès refusé', 403);
    }

    const { currentPassword, newPassword } = z.object({
      currentPassword: z.string().min(1),
      newPassword: z.string().min(8),
    }).parse(req.body);

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError('Utilisateur introuvable', 404);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppError('Mot de passe actuel incorrect', 400);

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id }, data: { passwordHash } });

    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAdmin, async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'Utilisateur supprimé' });
  } catch (err) {
    next(err);
  }
});

export default router;
