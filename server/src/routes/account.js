import { Router } from 'express';
import { attach, listOrders, showOrder, update } from '../controllers/account.js';
import { requireAuth, requireCsrf } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { emptyBody, orderNumberSchema, profileSchema } from '../validators/account.js';

const router = Router();

router.use(requireAuth);
router.patch('/', requireCsrf, validate(profileSchema), update);
router.get('/orders', listOrders);
router.post('/orders/attach', requireCsrf, validate(emptyBody), attach);
router.get('/orders/:orderNumber', validate(orderNumberSchema), showOrder);

export default router;
