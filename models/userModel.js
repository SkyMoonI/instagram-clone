const crypto = require('crypto'); // Used for token creation and encryption operations
const mongoose = require('mongoose');
const validator = require('validator'); // To check the validation of areas such as e-mail.
const bcrypt = require('bcryptjs'); // Used to safely hash passwords.

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please tell us a username!'],
    trim: true,
    maxLength: [100, 'A user name must have less or equal then 40 characters'],
  },
  name: {
    type: String,
    required: [true, 'Please tell us your name!'],
    trim: true,
    maxLength: [100, 'A user name must have less or equal then 40 characters'],
  },
  surname: {
    type: String,
    required: [true, 'Please tell us your surname!'],
    trim: true,
    maxLength: [100, 'A user name must have less or equal then 40 characters'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true, // this will convert email to lowercase. not check if it is a lowercase email.
    validate: [validator.isEmail, 'Please provide a valid email'], // calling the custom validator
  },
  photo: String,
  bio: {
    type: String,
    trim: true,
    maxLength: [255, 'A biography must have less or equal then 255 characters'],
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minLength: 8,
    maxLength: 64,
    select: false, // When the password field is brought from the database, it does not come by default
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      // the value of el is coming from entered value of the passwordConfirm field
      // this only works on CREATE and SAVE
      validator: function (el) {
        return el === this.password;
      },
      message: 'Passwords are not the same!',
    },
  },
  passwordChangedAt: Date, // this will store the time when the password was changed. If the password has changed after Token, invalidate the Token.
  passwordResetToken: String,
  passwordResetExpires: Date, // time the reset token expires
  // user soft-delete (Passive instead of deleting an account)
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followings: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
});

// Encrypt password only if the password has changed
// this will run before .save() and .create()
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  // this will not run if password is not modified
  // so we only want this function to encrypt the password
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  // cost of 12 is enough for these years
  // more of it will take more time, but it will be more secure
  this.password = await bcrypt.hash(this.password, 12);
  // Delete passwordConfirm field. Because we don't want to store it anymore.
  // it is only for validation at the beginning
  this.passwordConfirm = undefined;
  next();
});

// Update passwordChangedAt property
userSchema.pre('save', function (next) {
  // this.isNew is a mongoose function
  if (!this.isModified('password') || this.isNew) return next();

  // we are extracting 1 second from the current time.
  // Because sometimes the token is issued before the password is changed
  // The purpose of subtracting 1000 milliseconds (1 second) from the current time when setting '⁠passwordChangedAt' is to ensure
  // that the timestamp is correctly set before the JWT (JSON Web Token) is issued.
  // This small time adjustment helps to prevent potential timing issues where the JWT might be issued before the password change is fully registered in the database.
  // >  If you set '⁠passwordChangedAt⁠' to '⁠Date.now()' without any adjustment,
  // there could be a race condition where the JWT is created with an '⁠iat⁠' timestamp
  // that is exactly the same or even slightly before the '⁠passwordChangedAt⁠' timestamp.
  // > ⁠This timing issue might cause problems in your authentication logic,
  // especially if you have middleware that invalidates tokens issued before the password change
  // (e.g., to force a logout of all sessions after a password change).

  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Query middleware
// this will run before every find query
// so this will help us not to show the inactive users
userSchema.pre(/^find/, function (next) {
  // this points to the current query
  this.find({ active: { $ne: false } });
  next();
});

// instance method: it will be available on all documents of this collection
// we can't use the this.password keyword here because it will point to the current document
// so schema variables are not available
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// instance method: it will be available on all documents of this collection
/**
 * Checks if the password was changed after the given JWT timestamp.
 * @param {number} JWTTimestamp - The timestamp of the JWT.
 * @returns {boolean} - Returns true if the password was changed after the JWT was issued, otherwise false.
 */
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  // console.log(this.passwordChangedAt, JWTTimestamp);
  if (this.passwordChangedAt) {
    // we are trying to convert the passwordChangedAt to a number
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10,
    );
    // console.log(
    //   'Token issued before password change:',
    //   JWTTimestamp < changedTimestamp,
    // );

    // if the date of the token is issued is less than the date of the password changed
    // that means password is changed after the token was issued
    return JWTTimestamp < changedTimestamp;
  }
  // false means not changed
  return false;
};

userSchema.methods.createPasswordResetToken = function () {
  // generate random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // encrypt the token
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // { resetToken } this is generated token
  // this.passwordResetToken this is the encrypted token
  // we want to send the original token to the user mail
  // Because we will compare the token with the encrypted token
  console.log({ resetToken }, this.passwordResetToken);

  // 10 minutes from now
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
