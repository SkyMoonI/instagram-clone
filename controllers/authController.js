const crypto = require('crypto'); // It is used to produce token in operations such as password reset.
const { promisify } = require('util'); // To convert a Callback -based function to Promise. Here to use the JWT.Verify function with Await.
const jwt = require('jsonwebtoken'); // For JWT Token Creating and Verification.
const User = require('../models/userModel'); // MongoDB User Model
const catchAsync = require('../utils/catchAsync'); // Wrapper that can capture errors in async functions.
const AppError = require('../utils/appError'); // Special error class creates error with messages and status code.
const sendEmail = require('../utils/email'); // To send the password reset email.

// This produces a token of the user.
// There is only id in token. The secret key is taken from .env.
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res) => {
  // 1) Create JWT token
  const token = signToken(user._id);
  // 2) Create cookie options to send browser
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    // this means that the cookie can only be accessed by the server
    // cookie cannot be accessed or modified in any way by the browser
    httpOnly: true,
  };

  // secure is for https. it will only work in production
  // if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  if (process.env.COOKIE_SECURE === 'true') cookieOptions.secure = true;

  // 3) HTTP-only sends Token to the browser as a cookie
  res.cookie('jwt', token, cookieOptions);

  // 4) Undefineded the user's password (so that it is not included in the output).
  // Remove password from output.
  // Because we see password in postman when we create a new user
  user.password = undefined;

  // 5) Sends the token and user
  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
};

const signup = catchAsync(async (req, res, next) => {
  // we created the user with mongoose model. create func comes from mongoose
  const newUser = await User.create({
    username: req.body.username,
    name: req.body.name,
    surname: req.body.surname,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    // passwordChangedAt: req.body.passwordChangedAt,
    // role: req.body.role,
  });

  // Creates a token for the user and send it with the newUser to the browser
  createSendToken(newUser, 201, res);
});

const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) check if email and password exist
  if (!email || !password) {
    // we want to immediately stop the function
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) check if user exists && password is correct
  // if the field is not selected, we need to add '+' select('+password')
  // '+password' includes not selected password to the user to check it later
  const user = await User.findOne({ email }).select('+password');

  // 401 is unauthorized
  // we need to use the correctPassword in the if statement
  // because if the user is not found, the user will be undefined and correctPassword will throw an error
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) if everything ok, send token to client
  // const token = signToken(user._id);

  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });

  createSendToken(user, 200, res);
});

const protect = catchAsync(async (req, res, next) => {
  // 1) getting token and check of it's there
  let token;

  // common practice is to send the token using http header with the request
  // we can access the header using req.headers
  // in the headers we create authorization for the token
  // and the token value should be started with Bearer and  separated by space
  // authorization: 'Bearer asda;slfkas;dlk'
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // we want to remove the 'Bearer ' from the token because we don't need it
    token = req.headers.authorization.split(' ')[1];
  }
  // console.log(token);
  // console.log(req.headers);

  // if there is no token send with the request. that means we are not logged in
  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401),
    );
  }

  // 2) Verification token
  // ✅ This verifies if the token is real and not expired
  // ⏳ It waits for the result using await (since verify is async)
  // ⏳ `jwt.verify` normally uses callbacks, so we use `promisify` to make it awaitable
  // 🛡️ This step ensures the token is valid and not tampered with
  // 🔓 If the token is valid, we get the data inside it (e.g. user ID)
  // 🧾 The result `decoded` contains data like user ID and expiration
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);

  // 3) Check if user still exists
  // Because user maybe deleted or changed his password
  // so we need to check if the user still exists
  // that means no one has changed the jason web token
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401,
      ),
    );
  }

  // 4) Check if user changed password after the token was issued
  // iat = issued at
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401),
    );
  }
  // 5) Grant access to protected route
  req.user = currentUser; // now the user is available for the request for protected routes
  next();
});

/**
 * Middleware that restricts access to certain routes to certain roles.
 * @param {...string} roles - The roles that are allowed to access the route.
 * @returns {function} A middleware function that checks if the user has the required role.
 * 403 is forbidden
 */
const restrictTo =
  (...roles) =>
  (req, res, next) => {
    // roles ['admin', 'lead-guide']. role='user'
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }
    next();
  };

const forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with email address.', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();

  // we use validateBeforeSave: false because we want to update the document without validation
  // if we don't use it, it will throw an error
  // like this: "User validation failed: password: Path `password` is required."
  await user.save({ validateBeforeSave: false });

  // 3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host',
  )}/api/v1/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });
    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    // error means we couldn't send the email
    // so we have to reset/clean the logic
    // we reset the token and the expiration date
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    // we save the user
    await user.save({ validateBeforeSave: false });
    return next(
      new AppError(
        'There was an error sending the email. Try again later!',
        500,
      ),
    );
  }
});
const resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });
  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  // we don't use validateBeforeSave: false because we want to update the document with validation
  // validation will confirm the new password is the same as the confirm password
  await user.save();

  // 3) Update changedPasswordAt property for the user

  // 4) Log the user in, send JWT
  // const token = signToken(user._id);

  // res.status(200).json({
  //   status: 'success',
  //   token,
  // });

  createSendToken(user, 200, res);
});

const updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  // we need to add '+' to select('+password').
  // because field is not selected in the model
  const user = await User.findById(req.user.id).select('+password');
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  // 2) Check if POSTed current password is correct
  // 401 is unauthorized
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  // we didn't use User.findByIdAndUpdate because we want to update the document with validation
  // custom validation doesn't work with findByIdAndUpdate
  // and also .pre('save') doesn't work with findByIdAndUpdate
  await user.save();

  // 4) Log user in, send JWT
  const token = signToken(user._id);
  res.status(200).json({
    status: 'success',
    token,
  });
});

exports.signup = signup;
exports.login = login;
exports.protect = protect;
exports.restrictTo = restrictTo;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
exports.updatePassword = updatePassword;
