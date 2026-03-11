import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import path from 'path';

import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { swaggerSpec } from './utils/swagger';
import { prisma } from './utils/prisma';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/users.routes';
import projectRoutes from './routes/projects.routes';
import associateRoutes from './routes/associates.routes';
import accountRoutes from './routes/accounts.routes';
import transactionRoutes from './routes/transactions.routes';
import assetRoutes from './routes/assets.routes';
import livestockRoutes from './routes/livestock.routes';
import cropRoutes from './routes/crops.routes';
import stockRoutes from './routes/stocks.routes';
import saleRoutes from './routes/sales.routes';
import reportRoutes from './routes/reports.routes';
import closureRoutes from './routes/closures.routes';
import treasuryRoutes from './routes/treasury.routes';

const app = express();
const PORT = process.env.API_PORT || 3000;

// Faire confiance au reverse proxy Nginx (requis pour express-rate-limit + X-Forwarded-For)
app.set('trust proxy', 1);

// Sécurité
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Trop de requêtes, veuillez réessayer plus tard.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes.' }
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Documentation Swagger
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Agri-Compta API',
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', associateRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api', transactionRoutes);
app.use('/api', assetRoutes);
app.use('/api', livestockRoutes);
app.use('/api', cropRoutes);
app.use('/api', stockRoutes);
app.use('/api', saleRoutes);
app.use('/api', reportRoutes);
app.use('/api', closureRoutes);
app.use('/api', treasuryRoutes);

// Health check
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', database: 'disconnected' });
  }
});

// Gestion des erreurs
app.use(errorHandler);

// Route 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Route non trouvée' });
});

// Démarrage du serveur
const server = app.listen(PORT, () => {
  logger.info(`Serveur démarré sur le port ${PORT}`);
  logger.info(`Documentation API : http://localhost:${PORT}/api/docs`);
  logger.info(`Environnement : ${process.env.NODE_ENV || 'development'}`);
});

// Arrêt propre
process.on('SIGTERM', async () => {
  logger.info('Signal SIGTERM reçu, arrêt du serveur...');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Serveur arrêté proprement');
    process.exit(0);
  });
});

export default app;
