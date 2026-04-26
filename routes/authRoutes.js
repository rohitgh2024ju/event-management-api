import express from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { getMe, login, logout, signup } from '../controllers/authController.js';

const router = express.Router();

router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.post('/auth/logout', logout);
router.get('/auth/me', authMiddleware, getMe);

export default router;