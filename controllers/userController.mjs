import Joi from 'joi';

import User from '../models/UserModel/userModel.mjs';
import catchAsync from '../utils/catchAsync.mjs';
import AppError from '../utils/appError.mjs';
import { uploadFileToCloudinary } from '../utils/cloudinary.mjs';

const nameNotificationsSchema = Joi.object({
  name: Joi.string(),
  notifications: Joi.boolean(),
});

const profilePictureSchema = Joi.object({
  image: Joi.object({
    path: Joi.string().required(),
    size: Joi.number().max(5000000).required(), // Adjust the size limit as needed    5 mb
    mimetype: Joi.string().valid('image/jpeg', 'image/png').required(),
  }).required(),
});

export const getMe = (req, res, next) => {
  const user = {
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    profilePicture: req.user.profilePicture,
    notifications: req.user.notifications ? true : false,
  };

  res.status(200).json({
    status: 'success',
    data: {
      data: user,
    },
  });
};

export const validateUpdateProfile = catchAsync(async (req, res, next) => {
  const { error } = nameNotificationsSchema.validate(req.body);
  if (error) return next(new AppError(error.details[0].message), 400);
  next();
});

export const updateProfile = catchAsync(async (req, res, next) => {
  const userDataUpdate = {};
  if (req.body.name) userDataUpdate.name = req.body.name;
  if (req.body.notifications !== undefined)
    userDataUpdate.notifications = req.body.notifications === true ? 1 : 0;

  await new User().updateProfile(userDataUpdate, req.user.id);

  const user = {
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    profilePicture: req.user.profilePicture,
    notifications: req.user.notifications ? true : false,
  };

  if (userDataUpdate.name) user.name = req.body.name;
  if (userDataUpdate.notifications !== undefined)
    user.notifications = req.body.notifications;

  res.status(200).json({
    status: 'success',
    data: {
      data: user,
    },
  });
});

export const deleteProfilePicture = catchAsync(async (req, res, next) => {
  // this is soft delete to delete from cloudinary use the delete function from utils/cloudinary.mjs file also to delete from cloudinary too
  await new User().updateProfile({ profilePicture: null }, req.user.id);

  res.status(204).json({
    status: 'success',
    message: 'profile picture was successfully deleted',
  });
});

export const validateUpdateProfilePicture = (req, res, next) => {
  const { error } = profilePictureSchema.validate(req.files);

  if (error) return next(new AppError(error.details[0].message, 400));

  next();
};

export const updateProfilePicture = catchAsync(async (req, res, next) => {
  console.log(JSON.stringify(req.files));
  const image = req.files.image[0];

  const uploadedImage = await uploadFileToCloudinary(image);
  const profilePictureUrl = uploadedImage.url;

  await new User().updateProfile(
    { profilePicture: profilePictureUrl },
    req.user.id
  );

  const user = {
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
    profilePicture: profilePictureUrl,
    notifications: req.user.notifications ? true : false,
  };

  res.status(200).json({
    status: 'success',
    data: {
      data: user,
    },
  });
});
