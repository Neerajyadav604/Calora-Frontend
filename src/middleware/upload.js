const multer = require('multer');

const storage = multer.memoryStorage();

const imageFileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Only JPG and PNG images are allowed'));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

module.exports = upload;
