// this function takes a function as a parameter
// basically this returns the same function signature to return a promise
// then calles the function that passed in
// then calls the catch function to pass the error with the next function
// so that it can be handled by the global error handler
const catchAsync = (fn) => (req, res, next) => {
  fn(req, res, next).catch(next);
};

module.exports = catchAsync;
