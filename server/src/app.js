import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';
import { errorHandler, notFound } from './middleware/error.js';
import { apiLimiter, authLimiter } from './middleware/rateLimit.js';
import { sanitize } from './middleware/sanitize.js';
import { loadSession } from './middleware/session.js';
import accountRoutes from './routes/account.js';
import adminRoutes from './routes/admin.js';
import authRoutes from './routes/auth.js';
import cartRoutes from './routes/cart.js';
import healthRoutes from './routes/health.js';
import orderRoutes from './routes/orders.js';
import productRoutes from './routes/products.js';
import { uploadsDir } from './providers/storage.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet({
    // The shop calls this API from another origin. Helmet's default
    // same-origin resource policy would block that response in the browser.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || origin === config.clientOrigin) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  }));
  // Request line only. Bodies, cookies, and reset tokens are not written here.
  if (config.env !== 'test') app.use(morgan(config.env === 'production' ? 'tiny' : 'dev'));
  app.use(express.json({ limit: '100kb' }));
  app.use(sanitize);

  app.use('/api', apiLimiter);
  app.use('/api', loadSession);
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/account', accountRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/uploads', express.static(uploadsDir, { index: false, maxAge: '1h' }));
  app.use('/api', healthRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
