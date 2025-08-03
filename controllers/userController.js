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
  const filteredBody = filterObj(req.body, 'name', 'surname', 'photo', 'bio');

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

// inactivates the user
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

const followUser = catchAsync(async (req, res, next) => {
  // 1) find the user that you want to follow
  const userToFollow = await User.findById(req.params.id);
  if (!userToFollow || userToFollow.active === false) {
    return next(new AppError('No user found with that ID.', 404));
  }

  const currentUser = await User.findById(req.user.id);
  if (!currentUser) {
    return next(new AppError('No user found with that ID.', 404));
  }

  // 2) Prevent following yourself
  if (currentUser.id === userToFollow.id) {
    return next(new AppError('You can not follow yourself', 400));
  }

  // 3) Check if the user is already following the target
  if (currentUser.followings.includes(userToFollow._id)) {
    return next(new AppError('You are already followings this user', 400));
  }

  // 4) Add to followings & followers
  currentUser.followings.push(userToFollow._id);
  userToFollow.followers.push(currentUser._id);

  await currentUser.save({ validateBeforeSave: false });
  await userToFollow.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: `You are now following ${userToFollow.name}`,
  });
});

const unfollowUser = catchAsync(async (req, res, next) => {
  // 1) Find the user that you want to unfollow
  const userToFollow = await User.findById(req.params.id);
  if (!userToFollow || userToFollow.active === false) {
    return next(new AppError('No user found with that ID.', 404));
  }

  const currentUser = await User.findById(req.user.id);
  if (!currentUser) {
    return next(new AppError('No user found with that ID.', 404));
  }

  // 2) Prevent unfollowing yourself
  if (currentUser.id === userToFollow.id) {
    return next(new AppError('You can not unfollow yourself', 400));
  }

  // 3) Check if the user is not following the target
  if (!currentUser.followings.includes(userToFollow._id)) {
    return next(new AppError('You are already not following this user', 400));
  }

  // 4) Remove from followings & followers
  currentUser.followings.pull(userToFollow._id);
  userToFollow.followers.pull(currentUser._id);

  await currentUser.save({ validateBeforeSave: false });
  await userToFollow.save({ validateBeforeSave: false });

  res.status(200).json({
    status: 'success',
    message: `You have unfollowed ${userToFollow.name}`,
  });
});

const getFollowers = catchAsync(async (req, res, next) => {
  // populate, It fills the referenced data in Mongodb with real data during the query.
  const user = await User.findById(req.params.id).populate('followers');
  if (!user || user.active === false) {
    return next(new AppError('No user found with that ID.', 404));
  }

  res.status(200).json({
    status: 'success',
    results: user.followers.length,
    data: {
      followers: user.followers,
    },
  });
});

const getFollowings = catchAsync(async (req, res, next) => {
  // populate, It fills the referenced data in Mongodb with real data during the query.
  const user = await User.findById(req.params.id).populate('followings');
  if (!user || user.active === false) {
    return next(new AppError('No user found with that ID.', 404));
  }

  res.status(200).json({
    status: 'success',
    results: user.followings.length,
    data: {
      followers: user.followings,
    },
  });
});

// get user profile by username
const getUserByUsername = catchAsync(async (req, res, next) => {
  // we find the user by username
  const user = await User.findOne({ username: req.params.username });
  if (!user || user.active === false) {
    return next(new AppError('No user found with that ID.', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

// to search for users in search bar
const searchUsers = catchAsync(async (req, res, next) => {
  // 1) Get the search query from the query string
  // Example: /api/v1/users/search?q=john => searchQuery = 'john'
  // req.query includes the parameters after '?'.
  const searchQuery = req.query.q;

  // 2) If there is no search query, send error
  if (!searchQuery) {
    return next(new AppError('Please provide a search query', 400));
  }

  // 3) Find users that match the search query
  // Search users that match the search query in username, name, surname
  const users = await User.find({
    $or: [
      // Searches in username, name and surname.
      // $regex: searchQuery = searches strings that only contain searchQuery.
      // $options: i = case insensitive
      { username: { $regex: searchQuery, $options: 'i' } },
      { name: { $regex: searchQuery, $options: 'i' } },
      { surname: { $regex: searchQuery, $options: 'i' } },
    ],
    // Only return active users
    active: true,
  }).select('username name surname photo'); // only return username, name, surname and photo fields

  // 4) Send response
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

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
exports.getFollowings = getFollowings;
exports.getUserByUsername = getUserByUsername;
exports.searchUsers = searchUsers;
