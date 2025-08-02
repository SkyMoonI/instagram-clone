const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const {
  // admin methods
  getAllUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  // user methods
  getMe,
  updateMe,
  deleteMe,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getUserByUserName,
  searchUsers,
} = userController;

const {
  signup,
  login,
  protect,
  restrictTo,
  forgotPassword,
  resetPassword,
  updatePassword,
} = authController;

// this is called mounting a router
const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);

router.post('/forgotPassword', forgotPassword);
router.patch('/resetPassword/:token', resetPassword); // will be updated

// Protect all routes after this middleware
// so we don't have to put it in every route
router.use(protect);

// current user features

// getMe puts the current users id into req.user.id
// then gets the user with getUser
router.get('/me', getMe, getUser); // Get current logged-in user data
router.patch('/updateMe', updateMe); // Updates current logged-in user data
router.delete('/deleteMe', deleteMe); // Deletes(inactive) current logged-in user
router.patch('/updateMyPassword', updatePassword); // Updates current logged-in user password

// Social features
router.patch('/:id/follow', followUser); // Current user follows the user with given id
router.patch('/:id/unfollow', unfollowUser); // Current user unfollows the user with given id
router.get('/:id/followers', getFollowers); // Get the all followers with the given id
router.get('/:id/following', getFollowing); // Get the all followings with the given id

// Search and public profile
router.get('/u/:username', getUserByUserName); // '/u'(user) is to prevent overlapping with '/:id' route
router.get('/search', searchUsers);

// restrictTo all routes after this middleware
router.use(restrictTo('admin'));

router.route('/').get(getAllUsers).post(createUser);
router.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);

module.exports = router;
