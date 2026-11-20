import { Router } from 'express';
import { merge, replace, show } from '../controllers/cart.js';
import { requireAuth, requireCsrf } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { linesBody } from '../validators/cart.js';

const router = Router();

router.use(requireAuth);
router.get('/', show);
router.put('/', requireCsrf, validate(linesBody), replace);
router.post('/merge', requireCsrf, validate(linesBody), merge);

export default router;
