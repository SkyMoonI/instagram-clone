const Comment = require('../models/commentModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const filterObj = require('../utils/filterObj');
const isOwnerOrAdmin = require('../utils/isOwnerOrAdmin');

const createComment = catchAsync(async (req, res, next) => {
  // Only allow specific fields from the body
  const filteredBody = filterObj(req.body, 'content');

  // Set the user to the logged-in user
  if (req.user) {
    filteredBody.user = req.user.id;
  } else {
    return next(new AppError('You must be logged in to comment', 401));
  }

  // Set the post to the parent post
  if (req.params.postId) {
    filteredBody.post = req.params.postId;
  } else {
    return next(new AppError('You must be in a post to comment', 401));
  }

  // Create a new comment
  const newComment = await Comment.create(filteredBody);

  res.status(201).json({
    status: 'success',
    data: {
      comment: newComment,
    },
  });
});

const updateComment = catchAsync(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) return next(new AppError('No comment found with that ID', 404));

  // Only the comment owner or admin can update
  if (isOwnerOrAdmin(comment.user, req.user) === false) {
    return next(new AppError('You can not update this comment', 403));
  }

  // Whitelist only allowed fields
  const filteredBody = filterObj(req.body, 'content');

  // Update the comment
  const updatedComment = await Comment.findByIdAndUpdate(
    req.params.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).json({
    status: 'success',
    data: {
      comment: updatedComment,
    },
  });
});
const deleteComment = catchAsync(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) return next(new AppError('No comment found with that ID', 404));

  // Only the comment owner or admin can delete
  if (isOwnerOrAdmin(comment.user, req.user) === false) {
    return next(new AppError('You can not delete this comment', 403));
  }

  // Delete the comment
  await Comment.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

const getAllComments = catchAsync(async (req, res, next) => {
  let filter = {};
  if (req.params.postId) filter = { post: req.params.postId };

  const comments = await Comment.find(filter);

  res.status(200).json({
    status: 'success',
    results: comments.length,
    data: {
      comments,
    },
  });
});
const getComment = factory.getOne(Comment);

exports.getAllComments = getAllComments;
exports.getComment = getComment;
exports.createComment = createComment;
exports.updateComment = updateComment;
exports.deleteComment = deleteComment;
