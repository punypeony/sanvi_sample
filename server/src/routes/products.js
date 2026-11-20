import { Router } from 'express';
import { detail, list } from '../controllers/products.js';
import { create, list as listReviews } from '../controllers/reviews.js';
import { requireAuth, requireCsrf } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { listSchema, slugSchema } from '../validators/products.js';
import { createSchema, listSchema as reviewListSchema } from '../validators/reviews.js';

const router = Router();

router.get('/', validate(listSchema), list);
router.get('/:slug/reviews', validate(reviewListSchema), listReviews);
router.post('/:slug/reviews', requireAuth, requireCsrf, validate(createSchema), create);
router.get('/:slug', validate(slugSchema), detail);

export default router;
