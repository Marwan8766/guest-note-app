import express from 'express';
import * as authController from '../controllers/authController.mjs';

///////////////////

const router = express.Router();

router.post(
  '/signup',
  authController.preSignup,
  authController.validateSignupUserInput,
  authController.signup
);
router.post(
  '/confirmEmail',
  authController.validateConfirmEmail,
  authController.confirmEmail
);

router.post(
  '/resendOtp',
  authController.validateResendEmailConfrimOTp,
  authController.resendEmailConfirmOtp
);

router.post('/login', authController.validateLogin, authController.login);

router.post(
  '/forgotPassword',
  authController.validateResendEmailConfrimOTp,
  authController.forgotPassword
);
router.patch(
  '/resetPassword',
  authController.resetPasswordValidate,
  authController.resetPassword
);

// Protect all routes after this middleware
router.use(authController.protect);

router.post('/logout', authController.logout);
router.patch(
  '/updatePassword',
  authController.validateUpdatePassword,
  authController.updatePassword
);

export default router;
