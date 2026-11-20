import { Router } from 'express';
import {
  currentUser,
  forgotPassword,
  issueCsrf,
  loginUser,
  logoutUser,
  registerUser,
  resetUserPassword,
  updatePassword,
} from '../controllers/auth.js';
import { requireAuth, requireCsrf } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  emailSchema,
  loginSchema,
  passwordSchema,
  registerSchema,
  resetSchema,
} from '../validators/auth.js';

const router = Router();

router.get('/csrf', issueCsrf);
router.post('/login', requireCsrf, validate(loginSchema), loginUser);
router.post('/logout', requireCsrf, logoutUser);
router.get('/me', requireAuth, currentUser);
router.post('/register', requireCsrf, validate(registerSchema), registerUser);
router.post('/password', requireAuth, requireCsrf, validate(passwordSchema), updatePassword);
router.post('/forgot', requireCsrf, validate(emailSchema), forgotPassword);
router.post('/reset', requireCsrf, validate(resetSchema), resetUserPassword);

export default router;
