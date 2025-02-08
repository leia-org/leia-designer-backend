import winston from 'winston';

const isDevelop = process.env.NODE_ENV === 'develop';

const logger = winston.createLogger({
  level: isDevelop ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    isDevelop ? winston.format.colorize() : winston.format.uncolorize(),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
  ],
});

export default logger;
