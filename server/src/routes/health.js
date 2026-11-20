import { Router } from 'express';
import { show } from '../controllers/health.js';

const router = Router();

router.get('/health', show);

export default router;
