const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');

const deleteOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // admin can delete any document
    // user can only delete their own document
    if (req.user.role !== 'admin') {
      if (req.user.id !== req.params.id) {
        return next(
          new AppError(
            'You cannot delete this document. You are not the owner',
            403,
          ),
        );
      }
    }

    // deletes the document according to id
    const doc = await Model.findByIdAndDelete(req.params.id);

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });

const updateOne = (Model) =>
  catchAsync(async (req, res, next) => {
    // updates document according to id
    // new: true, returns a new updated doc
    // runValidators: true, runs schema validators
    const doc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

const createOne = (Model) =>
  catchAsync(async (req, res, next) => {
    const doc = await Model.create(req.body);

    res.status(201).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

// example: getOne(Comment, { path: 'user', select: 'username profilePic' })
// In this way, the user's name and profile picture returns under each comment.
const getOne = (Model, popOptions) =>
  catchAsync(async (req, res, next) => {
    // gets a doc with the id
    let query = Model.findById(req.params.id);
    // populate, It fills the referenced data in Mongodb with real data during the query.
    if (popOptions) query = query.populate(popOptions);
    const doc = await query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc,
      },
    });
  });

const getAll = (Model) =>
  catchAsync(async (req, res, next) => {
    // To allow for nested GET comments on the post (hack)
    let filter = {};
    if (req.params.postId) filter = { post: req.params.postId };

    const features = new APIFeatures(Model.find(filter), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate();
    const docs = await features.query;
    // const docs = await features.query.explain();

    // SEND RESPONSE
    res.status(200).json({
      status: 'success',
      results: docs.length,
      data: {
        data: docs,
      },
    });
  });

exports.deleteOne = deleteOne;
exports.updateOne = updateOne;
exports.createOne = createOne;
exports.getOne = getOne;
exports.getAll = getAll;
