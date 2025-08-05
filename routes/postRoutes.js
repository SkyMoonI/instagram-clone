const express = require('express');
const { protect } = require('../controllers/authController');
const {
  getAllPosts,
  getMyPosts,
  getPostsByUserId,
  getPost,
  createPost,
  updatePost,
  deletePost,

  // Image upload
  uploadPostImage,
  resizePostImage,

  // Like/unlike a post
  toggleLikePost,
} = require('../controllers/postController');

const commentRouter = require('./commentRoutes');

const router = express.Router();

// Nested routes
router.use('/:postId/comments', commentRouter);

// Liked/unlike a post
router.patch('/:postId/like', protect, toggleLikePost);

// Must be protected – personal posts
router.get('/me', protect, getMyPosts); // Get current user's posts

// for profile view
router.get('/user/:id', getPostsByUserId); // Get posts by any user's ID

// Individual post routes
router
  .route('/:id')
  .get(getPost)
  .patch(protect, uploadPostImage, resizePostImage, updatePost)
  .delete(protect, deletePost);

// Create post
router.post('/', protect, uploadPostImage, resizePostImage, createPost);

// Public or protected depending on design
router.get('/', getAllPosts); // Get all posts (e.g., for a public feed)

module.exports = router;
