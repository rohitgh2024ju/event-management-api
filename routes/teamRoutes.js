const express = require('express');

const { createTeam, joinTeam, removeMember, getMyTeam } = require('../controllers/teamController.js');
const { authMiddleware } = require('../middlewares/authMiddleware.js');

const router = express.Router();


router.post('/events/:eventId/team', authMiddleware, createTeam);
router.post('/team/join', authMiddleware, joinTeam);
router.get('/team/my', authMiddleware, getMyTeam);
router.patch('/team/:teamId/members/:userId', authMiddleware, removeMember);


module.exports = router;

/*POST   /api/events/:eventId/team
POST   /api/team/join
GET    /api/team/my
DELETE /api/team/:teamId/members/:userId*/