import jwt from 'jsonwebtoken';
import { promisify } from 'util';
import crypto from 'crypto';
import Joi from 'joi';
import AppError from '../utils/appError.mjs';
import catchAsync from '../utils/catchAsync.mjs';
import sendEmail from '../utils/email.mjs';
import User from '../models/UserModel/userModel.mjs';
import Token from '../models/TokenModel/tokenModel.mjs';
import BlackListToken from '../models/BlackListTokenModel/blackListTokenModel.mjs';

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const logoutUser = async (user) => {
  const tokenInstance = new Token();

  const tokens = await tokenInstance.getTokenByUserId(user.id);

  if (tokens.length > 0) {
    const blackListTokens = tokens.map((token) => ({
      token: token.token,
      expiresAt: Number(token.expiresAt),
    }));

    const createdTokens = await new BlackListToken().insertTokens(
      blackListTokens
    );

    if (createdTokens !== blackListTokens.length) {
      throw new Error('Error while logging out');
    }

    const deletedTokens = await tokenInstance.deleteTokensByUserId(user.id);

    if (deletedTokens !== tokens.length) {
      throw new Error('Error while logging out');
    }
  }
};

const createEmailConfirmOtpOptionsObj = (userEmail, otp) => {
  const html = `
  <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 0;
        }

        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
        }

        h1 {
          color: #0066cc;
          font-size: 24px;
          margin-bottom: 16px;
        }

        p {
          font-size: 16px;
          line-height: 1.5;
          color: #333333;
          margin-bottom: 24px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Use this OTP to confirm your email</h1>
        <p>Your OTP: ${otp}</p>
      </div>
    </body>
  </html>
`;

  return {
    email: userEmail,
    subject: 'Your Email Confirmation OTP (Valid for 90 seconds)',
    html,
  };
};

const createSendOtpEmail = async (user) => {
  try {
    const otp = await new User(user).createEmailConfirmOtp();

    if (!otp)
      return next(new AppError('Error signing you up please try again', 500));

    const optionsObj = createEmailConfirmOtpOptionsObj(user.email, otp);

    await sendEmail(optionsObj);
  } catch (err) {
    console.error(`Error creating or sending the OTP Email, ${err}`);
  }
};

export const preSignup = catchAsync(async (req, res, next) => {
  const userExist = await new User().findByEmail(req.body.email);

  if (!userExist) return next();

  if (userExist.emailConfirmed === true)
    return next(new AppError('This email already exists', 400));

  if (userExist.emailConfirmOtpExpires > Date.now())
    return next(
      new AppError(
        'Use the OTP that was sent to your Email to verify your Email',
        400
      )
    );

  if (userExist.emailConfirmOtpExpires < Date.now()) {
    await createSendOtpEmail(userExist);

    res.status(200).json({
      status: 'success',
      message: 'Your email confirm OTP has been sent to your email',
    });
  }
});

// Define the validation schema using Joi
const signupSchema = Joi.object({
  name: Joi.string().required(),
  password: Joi.string()
    .pattern(
      new RegExp(
        '^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%^&\\*])(?=.{8,})'
      )
    )
    .required(),
  email: Joi.string().email().required(),
}).messages({
  'string.pattern.base':
    'Password must have at least one lowercase, one uppercase, one number, one special character, and be at least 8 characters long',
});

// Create a new schema for email and password validation only
const emailPasswordSchema = Joi.object({
  email: signupSchema.extract('email'),
  password: signupSchema.extract('password'),
});

// Define the validation schema using Joi for email validation
const emailSchema = Joi.object({
  email: Joi.string().email().required(),
});

const emailOtpSchema = Joi.object({
  email: signupSchema.extract('email'),
  otp: Joi.string().length(5).pattern(/^\d+$/).required(),
}).messages({ 'string.pattern.base': 'OTP must be a 5-digit number' });

const resetPasswordSchema = Joi.object({
  email: signupSchema.extract('email'),
  password: signupSchema.extract('password'),
  otp: emailOtpSchema.extract('otp'),
});

const updatePasswordSchema = Joi.object({
  currentPassword: signupSchema.extract('password'),
  newPassword: signupSchema.extract('password'),
});

// Validation middleware
export const validateSignupUserInput = catchAsync(async (req, res, next) => {
  // Validate request body against the schema
  const { error } = signupSchema.validate({
    email: req.body.email,
    password: req.body.password,
    name: req.body.name,
  });

  if (error || req.body.password !== req.body.passwordConfirm) {
    // If validation fails, return a 400 Bad Request response
    return res.status(400).json({
      status: 'fail',
      message: error.details[0].message,
    });
  }

  // If validation succeeds, move to the next middleware
  next();
});

export const signup = catchAsync(async (req, res, next) => {
  const user = {
    name: req.body.name,
    password: req.body.password,
    email: req.body.email,
  };
  try {
    const newUser = await new User(user).createUser();

    await createSendOtpEmail(newUser);
  } catch (err) {
    console.error(err);
    return next(new AppError("Couldn't signup, please try again", 400));
  }
  res.status(200).json({
    status: 'success',
    message: 'Your email confirmation OTP has been sent to your email',
  });
});

export const validateConfirmEmail = catchAsync(async (req, res, next) => {
  const { error } = emailOtpSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));

  next();
});

export const confirmEmail = catchAsync(async (req, res, next) => {
  const { otp, email } = req.body;

  const userInstance = new User();

  let hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

  const user = await userInstance.findByEmail(email);

  if (!user)
    return next(
      new AppError("This Email doesn't exist, Please Signup first", 404)
    );

  if (user.emailConfirmOtp !== hashedOtp)
    return next(new AppError('Invalid OTP', 400));

  if (user.emailConfirmOtpExpires < Date.now())
    return next(
      new AppError(
        'Your OTP has expired, Please click resend to resend a new OTP to your Email',
        400
      )
    );

  const updateUserData = {
    emailConfirmed: true,
    emailConfirmOtp: null,
    emailConfirmOtpExpires: null,
  };
  await userInstance.updateProfile(updateUserData, user.id);

  const token = await signAndCreateToken(user.id);
  if (!token)
    return next(
      new AppError('Error while logging in please try again later', 400)
    );

  res.status(200).json({
    state: 'success',
    message: 'Your email has been successfully confirmed',
    token,
  });
});

export const validateResendEmailConfrimOTp = catchAsync(
  async (req, res, next) => {
    const { error } = emailSchema.validate(req.body);

    if (error) return next(new AppError(error.details[0].message, 400));

    next();
  }
);

export const resendEmailConfirmOtp = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await new User().findByEmail(email);

  if (!user) return next(new AppError("This user doesn't exist", 404));

  if (user.emailConfirmOtpExpires > Date.now())
    return next(new AppError("Your OTP hasn't expired yet", 400));

  await createSendOtpEmail(user);

  res.status(200).json({
    status: 'success',
    message: 'Your email confirmation OTP has been sent to your email',
  });
});

export const validateLogin = catchAsync(async (req, res, next) => {
  let { error } = emailPasswordSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message, 400));

  next();
});

export const login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const userInstance = new User();

  const user = await userInstance.findByEmail(email);

  if (!user || !(await userInstance.correctPassword(password, user.id)))
    return next(new AppError('Incorrect email or password', 401));

  if (!user.emailConfirmed)
    return next(new AppError('Please confirm your email first'));

  const token = await signAndCreateToken(user.id);
  if (!token)
    return next(
      new AppError('Error while logging in please try again later', 400)
    );

  res.status(200).json({
    status: 'success',
    token,
  });
});

export const logout = catchAsync(async (req, res, next) => {
  const user = req.user;
  try {
    await logoutUser(user);

    res.status(200).json({
      status: 'success',
      message: 'logged out successfully',
    });
  } catch (error) {
    console.error(error);
    return next(new AppError('Something went wrong while logging out', 500));
  }
});

export const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await new User().findByEmail(email);
  if (!user || !user.emailConfirmed)
    return next(new AppError('There is no user with this email'), 404);

  await createSendOtpEmail(user);

  res.status(200).json({
    status: 'success',
    message: 'Your reset OTP has been sent to your email',
  });
});

export const resetPasswordValidate = catchAsync(async (req, res, next) => {
  const { error } = resetPasswordSchema.validate({
    otp: req.body.otp,
    email: req.body.email,
    password: req.body.password,
  });

  if (error) return next(new AppError(error.details[0].message, 400));

  if (req.body.password !== req.body.passwordConfirm)
    return next(
      new AppError('password and passwordConfirm must be the same', 400)
    );

  next();
});

export const resetPassword = catchAsync(async (req, res, next) => {
  const { otp, email, password } = req.body;
  const userInstance = new User();

  const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

  const user = await userInstance.findByEmail(email);

  if (!user || user.emailConfirmOtp !== hashedOtp)
    return next(
      new AppError("This Email doesn't exist, Please Signup first", 404)
    );

  if (user.emailConfirmOtpExpires < Date.now())
    return next(
      new AppError(
        'Your OTP has expired, Please click resend to resend a new OTP to your Email',
        400
      )
    );

  await userInstance.updateUserPassword(password, user.id);

  try {
    await logoutUser(user);
  } catch (error) {
    console.error(error);
    return next(new AppError('Something went wrong while logging out', 500));
  }

  const token = await signAndCreateToken(user.id);
  if (!token)
    return next(
      new AppError('Error while logging in please try again later', 400)
    );

  res.status(200).json({
    status: 'success',
    token,
  });
});

export const validateUpdatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword, newPasswordConfirm } = req.body;

  const { error } = updatePasswordSchema.validate({
    currentPassword,
    newPassword,
  });

  if (error) return next(new AppError(error.details[0].message, 400));

  if (newPassword !== newPasswordConfirm)
    return next(
      new AppError('newPassword and newPasswordConfirm must be the same', 400)
    );

  const passwordCorrect = await new User().correctPassword(
    currentPassword,
    req.user.id
  );

  if (!passwordCorrect)
    return next(new AppError("Your current password isn't correct", 400));

  next();
});

export const updatePassword = catchAsync(async (req, res, next) => {
  const { newPassword } = req.body;

  const userInstance = new User();

  try {
    await logoutUser(req.user);
  } catch (error) {
    console.error(error);
    return next(new AppError('Something went wrong while logging out', 500));
  }

  await userInstance.updateUserPassword(newPassword, req.user.id);

  const token = await signAndCreateToken(req.user.id);
  if (!token)
    return next(
      new AppError('Error while logging in please try again later', 400)
    );

  res.status(200).json({
    status: 'success',
    message: 'Your Password has been updated successfully',
    token,
  });
});

const signAndCreateToken = async (userId) => {
  const token = signToken(userId);
  const expirationTime =
    Date.now() + parseInt(process.env.JWT_EXPIRES_IN) * 1000;
  const tokenDocument = await new Token().createToken(
    userId,
    token,
    expirationTime
  );
  if (!tokenDocument) return false;
  return token;
};

export const protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  )
    token = req.headers.authorization.split(' ')[1];

  if (!token)
    return next(new AppError("You aren't logged in, please login first", 401));

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const userInstance = new User();
  const currentUser = await userInstance.findById(decoded.id);
  if (!currentUser)
    return next(new AppError('This user does no longer exist'), 401);

  if (!currentUser.emailConfirmed)
    return next(new AppError('You must confirm your email first', 403));

  if (
    userInstance.passwordHasChanged(decoded.iat, currentUser.passwordChangedAt)
  )
    return next(
      new AppError('Your password has changed, please login again', 401)
    );

  const tokenBlackListed = await new BlackListToken().findByToken(token);
  if (tokenBlackListed)
    return next(
      new AppError('Your session has expired, please login again', 401)
    );

  req.user = currentUser;
  next();
});

export const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role))
      return next(
        new AppError("You don't have permission to perform this action", 403)
      );
    next();
  };


  export const protectSocket = async (token, socket) => {
    if (!token)
    return next(new AppError("You aren't logged in, please login first", 401));

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const userInstance = new User();
  const currentUser = await userInstance.findById(decoded.id);
  if (!currentUser)
    return next(new AppError('This user does no longer exist'), 401);

  if (!currentUser.emailConfirmed)
    return next(new AppError('You must confirm your email first', 403));

  if (
    userInstance.passwordHasChanged(decoded.iat, currentUser.passwordChangedAt)
  )
    return next(
      new AppError('Your password has changed, please login again', 401)
    );

  const tokenBlackListed = await new BlackListToken().findByToken(token);
  if (tokenBlackListed)
    return next(
      new AppError('Your session has expired, please login again', 401)
    );

  socket.user = currentUser;
  };
  