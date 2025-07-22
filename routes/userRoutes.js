const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

const {
  getAllUsers,
  updateMe,
  deleteMe,
  createUser,
  getUser,
  updateUser,
  deleteUser,
  getMe,
} = userController;

const {
  signup,
  login,
  protect,
  restrictTo,
  forgotPassword,
  resetPassword,
  updatePassword,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getUserByUsername,
  searchUsers,
} = authController;

// this is called mounting a router
const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);

router.post('/forgotPassword', forgotPassword);
router.patch('/resetPassword/:token', resetPassword);

// Protect all routes after this middleware
// so we don't have to put it in every route
router.use(protect);

router.patch('/updateMyPassword', updatePassword);
router.get('/me', getMe, getUser);
router.patch('/updateMe', updateMe);
router.delete('/deleteMe', deleteMe);

// Social features
router.patch('/:id/follow', followUser);
router.patch('/:id/unfollow', unfollowUser);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);

// Search and public profile
router.get('/u/:username', getUserByUsername);
router.get('/search', searchUsers);

// restrictTo all routes after this middleware
router.use(restrictTo('admin'));

router.route('/').get(getAllUsers).post(createUser);
router.route('/:id').get(getUser).patch(updateUser).delete(deleteUser);

module.exports = router;
