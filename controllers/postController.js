const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const upload = require('../utils/uploadImage');

const Post = require('../models/postModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');
const filterObj = require('../utils/filterObj');
const isOwnerOrAdmin = require('../utils/isOwnerOrAdmin');

const getMyPosts = catchAsync(async (req, res, next) => {
  const posts = await Post.find({ user: req.user.id });

  if (!posts) return next(new AppError('No posts found', 404));

  res.status(200).json({
    status: 'success',
    results: posts.length,
    data: {
      posts,
    },
  });
});
const getPostsByUserId = catchAsync(async (req, res, next) => {
  const posts = await Post.find({ user: req.params.id });

  if (!posts) return next(new AppError('No posts found', 404));

  res.status(200).json({
    status: 'success',
    results: posts.length,
    data: {
      posts,
    },
  });
});

const createPost = catchAsync(async (req, res, next) => {
  // Set the image to the uploaded image
  if (req.file) req.body.photo = req.file.filename;
  console.log(req.file.filename);
  console.log(req.body.photo);

  // Only allow specific fields from the body
  const filteredBody = filterObj(req.body, 'caption', 'image');

  // Set the user to the logged-in user
  filteredBody.user = req.user.id;

  // Create a new post
  const newPost = await Post.create(filteredBody);

  res.status(201).json({
    status: 'success',
    data: {
      post: newPost,
    },
  });
});
const updatePost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) return next(new AppError('No post found with that ID', 404));

  // Only the post owner or admin can update
  if (isOwnerOrAdmin(post.user, req.user) === false) {
    return next(new AppError('You can not update this post', 403));
  }

  // Set the image to the uploaded image
  if (req.file) req.body.photo = req.file.filename;

  // Whitelist only allowed fields
  const filteredBody = filterObj(req.body, 'caption', 'image');

  // Update the post
  const updatedPost = await Post.findByIdAndUpdate(
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
      post: updatedPost,
    },
  });
});
const deletePost = catchAsync(async (req, res, next) => {
  const post = await Post.findById(req.params.id);

  if (!post) return next(new AppError('No post found with that ID', 404));

  // Only the post owner or admin can delete
  if (isOwnerOrAdmin(post.user, req.user) === false) {
    return next(new AppError('You can not delete this post', 403));
  }

  // Delete the post
  await Post.findByIdAndDelete(req.params.id);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

const getAllPosts = factory.getAll(Post);
const getPost = factory.getOne(Post);

const uploadPostImage = upload.single('image');

const resizePostImage = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  // Ensure folder exists
  const photoDir = path.join(__dirname, '../public/img/posts');
  if (!fs.existsSync(photoDir)) fs.mkdirSync(photoDir, { recursive: true });

  const filename = `post-${req.user.id}-${Date.now()}.jpeg`;

  await sharp(req.file.buffer)
    .resize(1200, 1200)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`${photoDir}/${filename}`);

  req.body.image = filename;
  next();
});

const toggleLikePost = catchAsync(async (req, res, next) => {
  const { postId } = req.params;
  const userId = req.user.id;

  const post = await Post.findById(postId);

  if (!post) return next(new AppError('No post found with that ID', 404));
  const alreadyLiked = post.likes.includes(userId);

  if (alreadyLiked) {
    // Unlike
    post.likes.pull(userId);
  } else {
    // Like
    post.likes.push(userId);
  }

  await post.save();

  res.status(200).json({
    status: 'success',
    data: {
      liked: !alreadyLiked,
      // post: post,
      likes: post.likesCount,
    },
  });
});

exports.getAllPosts = getAllPosts;
exports.getMyPosts = getMyPosts;
exports.getPostsByUserId = getPostsByUserId;
exports.getPost = getPost;
exports.createPost = createPost;
exports.updatePost = updatePost;
exports.deletePost = deletePost;

exports.uploadPostImage = uploadPostImage;
exports.resizePostImage = resizePostImage;

exports.toggleLikePost = toggleLikePost;
