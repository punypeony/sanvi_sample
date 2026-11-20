import { Router } from 'express';
import { create, lookup } from '../controllers/orders.js';
import { requireCsrf } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createSchema, lookupSchema } from '../validators/orders.js';

const router = Router();

router.post('/', requireCsrf, validate(createSchema), create);
router.post('/lookup', requireCsrf, validate(lookupSchema), lookup);

export default router;
