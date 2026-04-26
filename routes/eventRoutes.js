const express = require('express');
const {
    createEvent,
    getAllEvents,
    getEventById,
    deleteEvent,
    updateEvent
} = require('../controllers/eventController.js');

const { adminMiddleware } = require('../middlewares/adminMiddleware.js');
const { authMiddleware } = require('../middlewares/authMiddleware.js');

const router = express.Router();


router.post('/events', authMiddleware, adminMiddleware, createEvent);
router.get('/events', authMiddleware, getAllEvents);
router.get('/events/:id', authMiddleware, getEventById);
router.patch('/events/:id', authMiddleware, adminMiddleware, updateEvent);
router.delete('/events/:id', authMiddleware, adminMiddleware, deleteEvent);


module.exports = router;

/*POST   /api/events
GET    /api/events
GET    /api/events/:id
PATCH  /api/events/:id
DELETE /api/events/:id*/