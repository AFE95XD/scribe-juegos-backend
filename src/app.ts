import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes';
import { errorHandler } from './middlewares/errorMiddleware';
import { generalLimiter } from './config/rateLimit';
import { setupSwagger } from './config/swagger';
import { env } from './config/env';

const app = express();

app.use(helmet());
// app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(generalLimiter);

app.use('/api/v1', routes);
setupSwagger(app);

// Health check endpoint para Dokploy/Google Cloud
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

export default app;
