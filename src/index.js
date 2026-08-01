import express from 'express';
import swaggerUi from 'swagger-ui-express';
import cors from 'cors';
import logger from './utils/logger.js';
import connectDB from './config/db.js';
import errorHandler from './middlewares/errorHandler.js';
import requestLogger from './middlewares/requestLogger.js';
import personaRoutesV1 from './routes/v1/personaRoutes.js';
import problemRoutesV1 from './routes/v1/problemRoutes.js';
import behaviourRoutesV1 from './routes/v1/behaviourRoutes.js';
import leiaRoutesV1 from './routes/v1/leiaRoutes.js';
import leiaDraftRoutesV1 from './routes/v1/leiaDraftRoutes.js';
import labelRoutesV1 from './routes/v1/labelRoutes.js';
import experimentRoutesV1 from './routes/v1/experimentRoutes.js';
import runnerRoutesV1 from './routes/v1/runnerRoutes.js';
import providerRoutesV1 from './routes/v1/providerRoutes.js';
import imageRoutesV1 from './routes/v1/imageRoutes.js';
import SwaggerParser from 'swagger-parser';
import { auth } from './middlewares/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
allowedOrigins.push(process.env.WORKBENCH_FRONTEND_URL);
allowedOrigins.push(`http://localhost:${PORT}`);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  })
);
app.use(express.json());
app.use(auth);
app.use(requestLogger);

// Swagger
SwaggerParser.bundle('./api/openapi.yaml')
  .then((bundledDoc) => {
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(bundledDoc));
  })
  .catch((error) => {
    console.error('Error bundling OAS file:', error);
  });

// Routes v1 authentication and authorization checks in routers
app.use('/api/v1/personas', personaRoutesV1);
app.use('/api/v1/problems', problemRoutesV1);
app.use('/api/v1/behaviours', behaviourRoutesV1);
app.use('/api/v1/leias', leiaRoutesV1);
app.use('/api/v1/leia-drafts', leiaDraftRoutesV1);
app.use('/api/v1/labels', labelRoutesV1);
app.use('/api/v1/experiments', experimentRoutesV1);
app.use('/api/v1/runner', runnerRoutesV1);
app.use('/api/v1/provider', providerRoutesV1);
app.use('/api/v1/images', imageRoutesV1);

// Error handling middleware
app.use(errorHandler);


const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });

    const gracefulShutdown = () => {
      logger.info('Shutting down server...');
      server.close(() => {
        logger.info('Server has been shut down');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    logger.error(`Error starting server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

export default app;
