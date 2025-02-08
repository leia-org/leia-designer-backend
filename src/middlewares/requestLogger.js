import logger from '../utils/logger.js';

const requestLogger = (req, _res, next) => {
  const logDetails = {
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    query: req.query,
    body: req.body,
  };
  logger.debug(JSON.stringify(logDetails, null, 2));
  next();
};

export default requestLogger;
