import express from 'express';
import { scanAttendance } from '../controllers/regController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';

const router = express.Router();

router.post('/attendance/scan', authMiddleware, adminMiddleware, scanAttendance);


export default router
// POST /api/attendance/scan