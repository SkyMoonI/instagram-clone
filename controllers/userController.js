const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

/**
 * This function takes an object and a list of allowed fields as input, and returns a new object that only contains the allowed fields.
 * @param {Object} obj - The object to filter.
 * @param  {...String} allowedFields - The list of allowed field names.
 * @returns {Object} - The filtered object.
 */
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

const getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

const getAllUsers = factory.getAll(User);

const updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400,
      ),
    );
  }
  // 2) Filtered out unwanted fields names that are not allowed to be updated

  //  we filter for the unwanted fields that are not allowed to be updated
  const filteredBody = filterObj(req.body, 'name', 'photo', 'bio');

  // we don't pass the req.body. Because anyone can change anything in the body
  // like password, role, etc
  // we used findByIdAndUpdate instead of findById
  // because we don't want the validators and .pre('save') to run
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  });
  // user.name = req.body.name;
  // await user.save();

  // 3) Update user document
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

const getUser = factory.getOne(User);

const createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /signup instead',
  });
};

const followUser = catchAsync(async (req, res, next) => {});

const unfollowUser = catchAsync(async (req, res, next) => {});

const getFollowers = catchAsync(async (req, res, next) => {});

const getFollowing = catchAsync(async (req, res, next) => {});

const getUserByUsername = catchAsync(async (req, res, next) => {});

const searchUsers = catchAsync(async (req, res, next) => {});

// do NOT update password with this
// this is for admin
const updateUser = factory.updateOne(User);
const deleteUser = factory.deleteOne(User);

exports.getAllUsers = getAllUsers;
exports.updateMe = updateMe;
exports.deleteMe = deleteMe;
exports.getUser = getUser;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.deleteUser = deleteUser;
exports.getMe = getMe;

exports.followUser = followUser;
exports.unfollowUser = unfollowUser;
exports.getFollowers = getFollowers;
exports.getFollowing = getFollowing;
exports.getUserByUsername = getUserByUsername;
exports.searchUsers = searchUsers;
