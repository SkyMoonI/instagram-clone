const AppError = require('../utils/appError');

/**
 * Creates a new AppError instance with a message about a CastError
 * coming from MongoDB, and a 400 status code.
 * @param {Error} err - The error coming from MongoDB
 * @returns {AppError} - The new AppError instance
 * @example 127.0.0.1:3000/api/v1/tours/wwwwwwwwwwwwwwwww
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

/**
 * Creates a new AppError instance with a message about a duplicate value
 * in the MongoDB database, and a 400 status code.
 * @param {Error} err - The error coming from MongoDB
 * @returns {AppError} - The new AppError instance
 * @example 127.0.0.1:3000/api/v1/users (POSTing duplicate name)
 */
const handleDuplicateFieldsDB = (err) => {
  // to find the value of the duplicate field in the error message
  // but using a regular expression is not the best solution
  // const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];

  // using the parameters of the error object to find the value(name)
  const value = err.keyValue.name;
  console.log(value);

  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

/**
 * Creates a new AppError instance with a message about invalid input data
 * coming from a model's validation, and a 400 status code.
 * Basically when trying to update a tour with invalid data
 * @param {Error} err - The error coming from the model's validation
 * @returns {AppError} - The new AppError instance
 * @example 127.0.0.1:3000/api/v1/tours/6870d1191766dd31881d0936 "ratingAverage": 500 (Updating input data)
 */
const handleValidationErrorDB = (err) => {
  // we need to extract the messages from the error object
  // because user could enter more than one invalid field data
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Creates a new AppError instance with a message about an invalid JSON Web Token
 * and a 401 status code.
 * @returns {AppError} - The new AppError instance
 * @example 127.0.0.1:3000/api/v1/users (POSTing with invalid token)
 */
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

/**
 * Creates a new AppError instance with a message about an expired JSON Web Token
 * and a 401 status code.
 * @returns {AppError} - The new AppError instance
 * @example 127.0.0.1:3000/api/v1/users (POSTing with expired token)
 */
const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // 1) log error
    console.error('ERROR 💥', err);

    // 2) send generic message
    // programming or other unknown error: we don't want to leak error details to client
    // 500 means internal server error
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500; // this is for the http status code
  err.status = err.status || 'error'; // this is for the status name of the error

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    // let error = { ...err }; // this is not working
    // This keeps both the prototype and enumerable properties
    // this is for hard copying the object
    let error = Object.create(Object.getPrototypeOf(err));
    Object.assign(error, err);

    if (error.name === 'CastError') error = handleCastErrorDB(error);
    // this error doesn't have a name so we use code field
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};

module.exports = globalErrorHandler;
