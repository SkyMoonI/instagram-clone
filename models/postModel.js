const mongoose = require('mongoose');

const postSchema = new mongoose.Schema(
  {
    caption: {
      type: String,
      required: [true, 'Please enter a caption'],
      trim: true,
      maxLength: [255, 'A caption must have less or equal then 255 characters'],
    },
    image: {
      type: String,
      required: [true, 'Please enter an image'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Post must belong to a user'],
    },
    likes: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

postSchema.virtual('likesCount').get(function () {
  return this.likes.length || 0;
});

const Post = mongoose.model('Post', postSchema);
module.exports = Post;
