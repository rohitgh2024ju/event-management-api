import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { userModel, eventModel, teamModel, regModel } from '../models/model.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

dotenv.config();

export async function createEvent(req, res) {
    try {
        let {
            title,
            description,
            date,
            maxParticipants,
            maxTeams,
            isTeamEvent,
            maxTeamSize
        } = req.body;

        if (!title || !description || !date || (maxParticipants === undefined)) {
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
        if (isNaN(parsedDate.getTime())) {
            return res.status(400).json({
                error: 'Invalid date format'
            });
        }

        maxParticipants = Number(maxParticipants);
        maxTeams = maxTeams !== undefined ? Number(maxTeams) : undefined;
        maxTeamSize = maxTeamSize !== undefined ? Number(maxTeamSize) : undefined;

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

        isTeamEvent = Boolean(isTeamEvent);

        if (isTeamEvent) {
            if (maxTeamSize === undefined || isNaN(maxTeamSize) || maxTeamSize <= 0) {
                return res.status(400).json({
                    error: 'maxTeamSize must be provided and positive for team events'
                });
            }

            if (maxTeams === undefined) {
                return res.status(400).json({
                    error: 'maxTeams must be provided for team events'
                });
            }
        } else {
            maxTeamSize = undefined;
            maxTeams = undefined;
        }

        const event = await eventModel.create({
            title,
            description,
            date: parsedDate,
            maxParticipants,
            maxTeams,
            maxTeamSize,
            isTeamEvent,
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

export async function getAllEvents(req, res) {
    try {
        const allEvents = await eventModel.find({}).sort({ date: 1 }).lean();

        if (allEvents.length === 0) {
            return res.status(200).json({ message: 'No events available' });
        }

        res.status(200).json({ events: allEvents });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function getEventById(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        const event = await eventModel.findById(id).lean();

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        res.status(200).json({ event });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function updateEvent(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        let {
            title,
            description,
            date,
            maxParticipants,
            maxTeams,
            isTeamEvent,
            maxTeamSize
        } = req.body;

        const updates = {};

        if (title !== undefined) {
            title = title.trim();
            if (!title) return res.status(400).json({ error: 'Title cannot be empty' });
            updates.title = title;
        }

        if (description !== undefined) {
            description = description.trim();
            if (!description) return res.status(400).json({ error: 'Description cannot be empty' });
            updates.description = description;
        }

        if (date !== undefined) {
            const parsedDate = new Date(date);
            if (isNaN(parsedDate.getTime())) {
                return res.status(400).json({ error: 'Invalid date format' });
            }
            updates.date = parsedDate;
        }

        if (maxParticipants !== undefined) {
            maxParticipants = Number(maxParticipants);
            if (isNaN(maxParticipants) || maxParticipants <= 0) {
                return res.status(400).json({ error: 'maxParticipants must be positive' });
            }
            updates.maxParticipants = maxParticipants;
        }

        if (maxTeams !== undefined) {
            maxTeams = Number(maxTeams);
            if (isNaN(maxTeams) || maxTeams <= 0) {
                return res.status(400).json({ error: 'maxTeams must be positive' });
            }
            updates.maxTeams = maxTeams;
        }

        if (maxTeamSize !== undefined) {
            maxTeamSize = Number(maxTeamSize);
            if (isNaN(maxTeamSize) || maxTeamSize <= 0) {
                return res.status(400).json({ error: 'maxTeamSize must be positive' });
            }
            updates.maxTeamSize = maxTeamSize;
        }

        if (isTeamEvent !== undefined) {
            updates.isTeamEvent = Boolean(isTeamEvent);
        }

        if (updates.isTeamEvent === true) {
            if (
                (updates.maxTeamSize === undefined && req.body.maxTeamSize === undefined) ||
                (updates.maxTeams === undefined && req.body.maxTeams === undefined)
            ) {
                return res.status(400).json({
                    error: 'maxTeams and maxTeamSize are required for team events'
                });
            }
        }

        if (updates.isTeamEvent === false) {
            updates.maxTeams = undefined;
            updates.maxTeamSize = undefined;
        }

        const event = await eventModel.findByIdAndUpdate(
            id,
            updates,
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

export async function deleteEvent(req, res) {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        const event = await eventModel.findByIdAndDelete(id);

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        res.status(200).json({
            message: 'Event deleted successfully'
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
