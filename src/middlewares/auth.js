import logger from '../utils/logger.js';
import { verifyToken } from '../utils/jwt.js';

export function auth(req, res, next) {
  req.auth = null;

  const authorizationHeader = req.headers['authorization'];
  const apiKeyHeader = req.headers['x-api-key'];

  logger.debug('Authorization header found');

  try {
    if (authorizationHeader) {
      const parts = authorizationHeader.split(' ');
      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        const error = new Error('Unauthorized: Invalid token format');
        error.statusCode = 401;
        return next(error);
      }

      const token = parts[1];
      req.auth = {
        method: 'JWT',
        payload: verifyToken(token),
      };
      return next();
    } else if (apiKeyHeader) {
      if (apiKeyHeader === process.env.API_KEY) {
        req.auth = {
          method: 'API_KEY',
          payload: { role: 'read' },
        };
        return next();
      } else {
        const error = new Error('Unauthorized: Invalid API key');
        error.statusCode = 401;
        return next(error);
      }
    }
  } catch (error) {
    logger.error('Error verifying token:', error);
    error.statusCode = 401;
    return next(error);
  }
  return next();
}

export function requireAdmin(req, res, next) {
  if (req.auth?.payload?.role !== 'admin') {
    const error = new Error('Unauthorized: Admin access required');
    error.statusCode = 403;
    return next(error);
  }
  return next();
}

export function requireInstructor(req, res, next) {
  if (req.auth?.payload?.role !== 'instructor') {
    const error = new Error('Unauthorized: Instructor access required');
    error.statusCode = 403;
    return next(error);
  }
  return next();
}

export function requireAdvanced(req, res, next) {
  if (req.auth?.payload?.role !== 'advanced' && req.auth?.payload?.role !== 'admin') {
    const error = new Error('Unauthorized: Advanced access required');
    error.statusCode = 403;
    return next(error);
  }
  return next();
}

// This middleware is used to check if the user or service is authenticated
export function requireAuthentication(req, res, next) {
  if (!req.auth) {
    const error = new Error('Unauthorized: Login or API key required');
    error.statusCode = 401;
    return next(error);
  }
  return next();
}

// This middleware is used to check if the user is logged in with JWT
export function requireJwtAuthentication(req, res, next) {
  if (req.auth?.method !== 'JWT') {
    const error = new Error('Unauthorized: Login required');
    error.statusCode = 401;
    return next(error);
  }
  return next();
}

// This middleware is used to check if the user is logged in with API key
export function requireApiKeyAuthentication(req, res, next) {
  if (req.auth?.method !== 'API_KEY') {
    const error = new Error('Unauthorized: API key required');
    error.statusCode = 401;
    return next(error);
  }
  return next();
}
