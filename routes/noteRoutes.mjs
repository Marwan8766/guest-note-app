import express from 'express';
import { protect } from '../controllers/authController.mjs';
import * as noteController from '../controllers/noteController.mjs';
import { configureCloudinary } from '../utils/cloudinary.mjs';
import { myMulter, fileValidation } from '../utils/multer.mjs';

const router = express.Router();

// Protect all routes after this middleware
router.use(protect);

router
  .route('/')
  .post(
    myMulter(fileValidation.media),
    noteController.validateSendNote,
    configureCloudinary,
    noteController.sendNoteUploadMedia,
    noteController.sendNote
  )
  .delete(noteController.validateDeleteNote, noteController.deleteNote)
  .get(noteController.validateGetNotes, noteController.getNotes);

export default router;
