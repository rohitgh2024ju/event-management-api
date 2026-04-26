import express from 'express';
import { createTeam, joinTeam, removeMember, getMyTeam } from '../controllers/teamController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/events/:eventId/team', authMiddleware, createTeam);
router.post('/team/join', authMiddleware, joinTeam);
router.get('/team/my', authMiddleware, getMyTeam);
router.delete('/team/:teamId/members/:userId', authMiddleware, removeMember);

export default router;