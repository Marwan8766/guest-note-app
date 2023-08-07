import AppError from '../utils/appError.mjs';

const handleJWTExpiredError = () =>
  new AppError('Your token has expired, please login again', 401);

const handleJWTError = () =>
  new AppError('Invalid token please login and try again', 401);

const handleCastErrorDB = (err) =>
  new AppError(`Invalid ${err.path} : ${err.value}`, 400);

const handleDuplicateFieldsDB = (err) => {
  const value = err.message.match(/(['"])((\\\1|.)*?)\1/gm);
  return new AppError(`${value} already exists`, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  return new AppError(`Invalid input data ${errors.join('. ')}`, 400);
};

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error('ERROR', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong',
    });
  }
};

export default async (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  console.error('error', err);
  console.log('checked error type');
  console.log(process.env.STATE);
  console.log(process.env.DATABASE);

  if (process.env.STATE === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.STATE === 'production') {
    let error = { ...err };
    error.message = err.message;
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
    sendErrorProd(error, res);
  }
};
