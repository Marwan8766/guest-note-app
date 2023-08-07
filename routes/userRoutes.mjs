import express from 'express';
import * as authController from '../controllers/authController.mjs';
import * as userController from '../controllers/userController.mjs';
import { configureCloudinary } from '../utils/cloudinary.mjs';
import { myMulter, fileValidation } from '../utils/multer.mjs';

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router.get('/me', userController.getMe);

router.patch(
  '/profile',
  userController.validateUpdateProfile,
  userController.updateProfile
);

router
  .route('/profile/picture')
  .delete(userController.deleteProfilePicture)
  .patch(
    userController.validateUpdateProfilePicture,
    myMulter(fileValidation.image),
    configureCloudinary,
    userController.updateProfilePicture
  );

export default router;
