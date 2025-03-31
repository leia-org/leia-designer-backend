import logger from '../utils/logger.js';
import { verifyToken } from '../utils/jwt.js';

export function auth(req, res, next) {
  const authorizationHeader = req.headers.authorization;

  if (!authorizationHeader) {
    logger.debug('No authorization header found');
    req.auth = null;
    return next();
  }

  logger.debug('Authorization header found');
  const parts = authorizationHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    const error = new Error('Unauthorized: Invalid token format');
    error.statusCode = 401;
    return next(error);
  }

  const token = parts[1];
  try {
    req.auth = verifyToken(token);
    return next();
  } catch (error) {
    error.statusCode = 401;
    return next(error);
  }
}

export function admin(req, res, next) {
  if (req.auth?.role !== 'admin') {
    const error = new Error('Unauthorized: Admin access required');
    error.statusCode = 403;
    return next(error);
  }
  return next();
}

export function instructor(req, res, next) {
  if (req.auth?.role !== 'instructor') {
    const error = new Error('Unauthorized: Instructor access required');
    error.statusCode = 403;
    return next(error);
  }
  return next();
}

export function instructorOrAdmin(req, res, next) {
  if (req.auth?.role !== 'instructor' && req.auth?.role !== 'admin') {
    const error = new Error('Unauthorized: Instructor or Admin access required');
    error.statusCode = 403;
    return next(error);
  }
  return next();
}

export function loggedIn(req, res, next) {
  if (!req.auth) {
    const error = new Error('Unauthorized: Login required');
    error.statusCode = 401;
    return next(error);
  }
  return next();
}
