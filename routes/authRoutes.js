const express = require('express');
const { authMiddleware } = require('../middlewares/authMiddleware.js');
const { getMe, login, logout, signup } = require('../controllers/authController.js');

const router = express.Router();

router.post('signup', signup);
router.post('/login', login);
router.post('/logout', authMiddleware, logout);
router.get('/me', authMiddleware, getMe);

module.exports = router;

/*POST   /api/auth/signup 
POST   /api/auth/login   
POST   /api/auth/logout   
GET    /api/auth/me */