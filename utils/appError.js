class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    // we are using template literal, because we want to check if the statusCode starts with 4
    // startsWith only works for strings
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    // this is for operational errors
    // so basically the errors that we create ourselves
    this.isOperational = true;
    // capture stack trace basically shows us where the error is coming from/happened
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
