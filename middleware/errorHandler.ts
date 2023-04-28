import { ErrorRequestHandler } from 'express';
import logger from '../common/logger';

const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  logger.error({ message: error.message, stack: error.stack });
  res.json({
    code: 'INTERNAL_SERVER_ERROR',
    message: error.message,
  });
};

export default errorHandler;