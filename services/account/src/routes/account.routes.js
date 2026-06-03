// services/account/src/routes/account.routes.js
import { Router } from 'express';
import { getAccount } from '../controllers/account.controller.js';

const router = Router();
router.get('/', getAccount);
export default router;
