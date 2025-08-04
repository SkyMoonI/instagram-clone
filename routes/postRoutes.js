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
} = require('../controllers/postController');

const commentRouter = require('./commentRoutes');

const router = express.Router();

// Nested routes
router.use('/:postId/comments', commentRouter);

// Must be protected – personal posts
router.get('/me', protect, getMyPosts); // Get current user's posts

// for profile view
router.get('/user/:id', getPostsByUserId); // Get posts by any user's ID

// Individual post routes
router
  .route('/:id')
  .get(getPost)
  .patch(protect, updatePost)
  .delete(protect, deletePost);

// Create post
router.post('/', protect, createPost);

// Public or protected depending on design
router.get('/', getAllPosts); // Get all posts (e.g., for a public feed)

module.exports = router;
