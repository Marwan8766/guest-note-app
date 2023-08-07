import multer from 'multer';

export const fileValidation = {
  image: ['image/png', 'image/jpeg'],
  pdf: ['application/pdf'],
  media: ['image/png', 'image/jpeg', 'application/pdf'],
};

export const myMulter = function (customValidation) {
  const storage = multer.diskStorage({});

  function fileFilter(req, file, cb) {
    if (customValidation.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb('invalid format', false);
    }
  }

  // Middleware function that handles both single and multiple image uploads
  const uploadMiddleware = multer({
    fileFilter,
    storage,
    limits: {
      files: 5, // Maximum 5 files in a single request
      fileSize: 30 * 1024 * 1024, // 30MB file size limit (adjust as needed)
      // fileSize: 1.7 * 1024 * 1024, // only accept max size 1.7 mb
    },
  }).fields([
    { name: 'image', maxCount: 1 }, // For single image upload
    { name: 'profilePicture', maxCount: 1 }, // For single image upload
    { name: 'images', maxCount: 5 }, // For multiple images upload (maximum 5 allowed)
    { name: 'media', maxCount: 5 },
  ]);

  return uploadMiddleware;
};
