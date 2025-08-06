const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Please enter a comment'],
      trim: true,
      maxLength: [255, 'A comment must have less or equal then 255 characters'],
    },
    post: {
      type: mongoose.Schema.ObjectId,
      ref: 'Post',
      required: [true, 'Comment must belong to a post'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Comment must belong to a user'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

commentSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'username photo',
  });
  next();
});

commentSchema.virtual('likesCount').get(function () {
  return this.likes.length || 0;
});

const Comment = mongoose.model('Comment', commentSchema);
module.exports = Comment;
