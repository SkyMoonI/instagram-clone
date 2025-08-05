const multer = require('multer');

const AppError = require('./appError');

// Use memory storage so we can edit file with sharp before saving
const multerStorage = multer.memoryStorage();

// Accept only images
const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) cb(null, true);
  else cb(new AppError('Not an image! Please upload an image', 400), false);
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

module.exports = upload;
