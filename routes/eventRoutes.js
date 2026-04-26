import express from 'express';
import {
    createEvent,
    getAllEvents,
    getEventById,
    deleteEvent,
    updateEvent
} from '../controllers/eventController.js';

import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/events', authMiddleware, adminMiddleware, createEvent);
router.get('/events', authMiddleware, getAllEvents);
router.get('/events/:id', authMiddleware, getEventById);
router.patch('/events/:id', authMiddleware, adminMiddleware, updateEvent);
router.delete('/events/:id', authMiddleware, adminMiddleware, deleteEvent);

export default router;