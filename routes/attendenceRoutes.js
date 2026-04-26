const express = require('express');

const { scanAttendance } = require('../controllers/attendanceController.js');

const { authMiddleware } = require('../middlewares/authMiddleware.js');
const { adminMiddleware } = require('../middlewares/adminMiddleware.js');

const router = express.Router();

router.post('/attendance/scan', authMiddleware, adminMiddleware, scanAttendance);


module.exports = router;

// POST /api/attendance/scan