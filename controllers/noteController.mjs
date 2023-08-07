import Joi from 'joi';

import Note from '../models/NoteModel/noteModel.mjs';
import catchAsync from '../utils/catchAsync.mjs';
import AppError from '../utils/appError.mjs';
import { uploadFileToCloudinary } from '../utils/cloudinary.mjs';

const sendNoteSchema = Joi.object({
  receiverUserIds: Joi.array().items(Joi.number().integer()).required(),
  typeId: Joi.number().integer().required(),
  title: Joi.string().required(),
  message: Joi.string().required(),
});

const getNotesSchema = Joi.object({
  types: Joi.array().items(Joi.number().integer()),
  page: Joi.number().integer(),
  pageSize: Joi.number().integer(),
});

const deleteNoteSchema = Joi.object({
  notes: Joi.array().items(Joi.number().integer()).required(),
});

export const validateSendNote = (req, res, next) => {
  req.body.receiverUserIds = JSON.parse(req.body.receiverUserIds);

  // console.log(`reciver: ${req.body.receiverUserIds.length}`);
  // console.log(`reciver: ${typeof req.body.receiverUserIds}`);

  const { error } = sendNoteSchema.validate({
    receiverUserIds: req.body.receiverUserIds,
    title: req.body.title,
    message: req.body.message,
    typeId: req.body.typeId,
  });

  if (error) return next(new AppError(error.details[0].message, 400));

  console.log(`validate ended....`);
  next();
};

export const validateGetNotes = (req, res, next) => {
  const { page, pageSize, types } = req.query;
  const typesArr = types.split(' ');

  const { error } = getNotesSchema.validate({
    page,
    pageSize,
    types: typesArr,
  });
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  next();
};

export const validateDeleteNote = (req, res, next) => {
  const { error } = deleteNoteSchema.validate(req.body);
  if (error) {
    return next(new AppError(error.details[0].message, 400));
  }
  next();
};

export const sendNoteUploadMedia = catchAsync(async (req, res, next) => {
  console.log(`upload will start...`);
  const mediaFiles = req.files.media;
  if (mediaFiles.length === 0) return next();

  const mediaUrls = [];
  const uploadPromises = [];

  for (const file of mediaFiles) {
    uploadPromises.push(uploadFileToCloudinary(file));
  }

  // Wait for all promises to be resolved using Promise.all
  const uploadedMedia = await Promise.all(uploadPromises);

  // Extract media URLs from resolved promises and push them to mediaUrls array
  uploadedMedia.forEach((media) => {
    mediaUrls.push(media.url);
  });

  req.mediaUrls = mediaUrls;

  console.log(`upload ended...`);
  next();
});

export const sendNote = catchAsync(async (req, res, next) => {
  const { receiverUserIds, typeId, title, message } = req.body;
  const { mediaUrls } = req;

  console.log('send note started: ...');
  await new Note().createNotesForUsers(
    req.user.id,
    receiverUserIds,
    typeId,
    title,
    message,
    mediaUrls
  );

  res.status(200).json({
    status: 'success',
    message: 'Notes were sent successfully',
  });
});

export const getNotes = catchAsync(async (req, res, next) => {
  const { page, pageSize, types } = req.query;
  const typesArr = types.split(' ').map(Number);

  console.log(`page: ${page}`);
  console.log(`pageSize: ${pageSize}`);
  console.log(`typesArr: ${typesArr}`);

  const notes = await new Note().getUserTimelineNotes(
    req.user.id,
    typesArr,
    page ? Number(page) : 1,
    pageSize ? Number(pageSize) : 5
  );

  if (notes.length === 0) return next(new AppError('No notes were found', 404));

  res.status(200).json({
    status: 'success',
    length: notes.length,
    page,
    pageSize,
    data: {
      data: notes,
    },
  });
});

export const deleteNote = catchAsync(async (req, res, next) => {
  const { notes } = req.body;

  const notesDeleted = await new Note().deleteReceivedNotes(req.user.id, notes);

  if (notesDeleted.length === 0)
    return next(new AppError('There were no notes to be deleted', 404));

  res.status(204).json({
    status: 'success',
    message: 'notes were deleted successfully',
  });
});
