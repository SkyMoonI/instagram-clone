const express = require('express');
const { protect } = require('../controllers/authController');

const {
  getAllComments,
  getComment,
  createComment,
  updateComment,
  deleteComment,
} = require('../controllers/commentController');

const router = express.Router({ mergeParams: true }); // mergeParams needed to access postId from parent routes

router.use(protect);

// Route to get all comments or create a new comment for a post if nested under /posts/:postId/comments
router
  .route('/')
  .get(getAllComments) // Supports optional filtering by postId in controller
  .post(createComment); // Requires postId in req.params for nested routes

router.route('/:id').get(getComment).patch(updateComment).delete(deleteComment);

module.exports = router;
