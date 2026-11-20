import { Router } from 'express';
import {
  create,
  createNote,
  deleteImage,
  showAudit,
  showCustomer,
  showCustomers,
  showDashboard,
  showOrder,
  showOrders,
  showProduct,
  showProducts,
  showReviews,
  update,
  updateCustomer,
  updateOrder,
  updateReview,
  updateRole,
  uploadImage,
} from '../controllers/admin.js';
import { requireAdmin, requireCsrfForWrites } from '../middleware/auth.js';
import { imageUpload } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { adminListSchema, moderateSchema } from '../validators/reviews.js';
import {
  activeSchema,
  createProductSchema,
  customerQuerySchema,
  orderListSchema,
  orderNoteSchema,
  orderNumberSchema,
  orderStatusSchema,
  productIdSchema,
  roleSchema,
  updateProductSchema,
} from '../validators/admin.js';

const router = Router();

router.use(requireAdmin);
router.use(requireCsrfForWrites);

router.get('/dashboard', showDashboard);
router.get('/products', showProducts);
router.get('/products/:id', validate(productIdSchema), showProduct);
router.post('/products', validate(createProductSchema), create);
router.patch('/products/:id', validate(updateProductSchema), update);
router.post('/products/:id/images', imageUpload, uploadImage);
router.delete('/products/:id/images/:imageId', deleteImage);
router.get('/orders', validate(orderListSchema), showOrders);
router.get('/orders/:orderNumber', validate(orderNumberSchema), showOrder);
router.patch('/orders/:orderNumber', validate(orderStatusSchema), updateOrder);
router.post('/orders/:orderNumber/notes', validate(orderNoteSchema), createNote);
router.get('/customers', validate(customerQuerySchema), showCustomers);
router.get('/customers/:id', showCustomer);
router.patch('/customers/:id', validate(activeSchema), updateCustomer);
router.post('/users/:id/role', validate(roleSchema), updateRole);
router.get('/reviews', validate(adminListSchema), showReviews);
router.patch('/reviews/:id', validate(moderateSchema), updateReview);
router.get('/audit', showAudit);

export default router;
