import multer from 'multer';
import { HttpError } from '../utils/httpError.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
});

export function imageUpload(req, res, next) {
  upload.single('image')(req, res, (error) => {
    if (error) {
      next(new HttpError(400, 'Upload a JPEG, PNG, or WebP image up to 2 MB.'));
      return;
    }
    next();
  });
}
