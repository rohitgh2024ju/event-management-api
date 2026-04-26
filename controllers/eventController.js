const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { userModel, eventModel, teamModel, regModel } = require('../models/model.js');
const { adminMiddleware } = require('../middlewares/adminMiddleware.js')
const { authMiddleware } = require('../middlewares/authMiddleware.js')



async function createEvent(req, res) {
    try {
        let { title, description, date, maxParticipants, maxTeams } = req.body;

        if (!title || !description || !date || maxParticipants === undefined) {
            return res.status(400).json({
                error: 'Required fields missing'
            });
        }

        title = title.trim();
        description = description.trim();

        if (!title || !description) {
            return res.status(400).json({
                error: 'Title and description cannot be empty'
            });
        }
        const parsedDate = new Date(date);
        if (isNaN(parsedDate)) {
            return res.status(400).json({
                error: 'Invalid date format'
            });
        }

        maxParticipants = Number(maxParticipants);
        maxTeams = maxTeams !== undefined ? Number(maxTeams) : undefined;

        if (isNaN(maxParticipants) || maxParticipants <= 0) {
            return res.status(400).json({
                error: 'maxParticipants must be a positive number'
            });
        }

        if (maxTeams !== undefined && (isNaN(maxTeams) || maxTeams <= 0)) {
            return res.status(400).json({
                error: 'maxTeams must be a positive number'
            });
        }

        const event = await eventModel.create({
            title,
            description,
            date: parsedDate,
            maxParticipants,
            maxTeams,
            createdBy: req.user.id
        });

        res.status(201).json({
            message: 'Event created successfully',
            event
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
}

async function getAllEvents(req, res) {
    try {
        const allEvents = await eventModel.find({}).sort({ date: 1 }).lean();
        if (allEvents.length === 0) return res.status(200).json({ message: 'No events available' });

        res.json({
            events: allEvents
        })
    } catch (err) {
        res.status(500).json({
            error: err.message
        })
    }
};

async function getEventById(req, res) {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                error: 'Invalid event ID'
            });
        }
        const event = await eventModel.findById(id);
        if (!event) return res.status(404).json({ message: 'No events available by this ID' });

        res.json({ event });

    } catch (err) {
        res.status(500).json({
            error: err.message
        })
    }
};

async function updateEvent(req, res) {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        let { title, description, date, maxParticipants, maxTeams } = req.body;

        if (title) {
            title = title.trim();
            if (!title) return res.status(400).json({ error: 'Title cannot be empty' });
        }

        if (description) {
            description = description.trim();
            if (!description) return res.status(400).json({ error: 'Description cannot be empty' });
        }

        if (date) {
            const parsedDate = new Date(date);
            if (isNaN(parsedDate)) {
                return res.status(400).json({ error: 'Invalid date format' });
            }
            date = parsedDate;
        }

        if (maxParticipants !== undefined) {
            maxParticipants = Number(maxParticipants);
            if (isNaN(maxParticipants) || maxParticipants <= 0) {
                return res.status(400).json({ error: 'maxParticipants must be positive' });
            }
        }

        if (maxTeams !== undefined) {
            maxTeams = Number(maxTeams);
            if (isNaN(maxTeams) || maxTeams <= 0) {
                return res.status(400).json({ error: 'maxTeams must be positive' });
            }
        }

        const event = await eventModel.findByIdAndUpdate(
            id,
            { title, description, date, maxParticipants, maxTeams },
            { new: true, runValidators: true }
        );

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        res.status(200).json({
            message: 'Event updated successfully',
            event
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


async function deleteEvent(req, res) {
    try {
        const id = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                error: 'Invalid event ID'
            });
        }

        const event = await eventModel.findByIdAndDelete(id);

        if (!event) {
            return res.status(404).json({
                error: 'Event not found'
            });
        }

        res.status(200).json({
            message: 'Event deleted successfully'
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
};

module.exports = { createEvent, getAllEvents, getEventById, deleteEvent, updateEvent }