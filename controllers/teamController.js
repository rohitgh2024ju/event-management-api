const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { userModel, eventModel, teamModel, regModel } = require('../models/model.js');
const { adminMiddleware } = require('../middlewares/adminMiddleware.js')
const { authMiddleware } = require('../middlewares/authMiddleware.js');
const { json } = require('express');
const { Schema, default: mongoose } = require('mongoose');

const nodemailer = require('nodemailer');

async function createTeam(req, res) {
    try {
        // POST /api/events/:eventId/team

        const { eventId } = req.params;
        const userId = req.user.id;
        const { name } = req.body;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ error: 'invalid event ID' });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'team name is required' });
        }

        const event = await eventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ error: 'event not found' });
        }

        if (!event.isTeamEvent) {
            return res.status(400).json({
                error: 'this event is not team based'
            });
        }

        const existingTeam = await teamModel.findOne({
            eventId,
            members: userId
        });

        if (existingTeam) {
            return res.status(400).json({
                error: 'user already in a team for this event'
            });
        }

        if (event.maxTeams) {
            const teamCount = await teamModel.countDocuments({ eventId });

            if (teamCount >= event.maxTeams) {
                return res.status(400).json({
                    error: 'maximum team limit reached'
                });
            }
        }

        const isMatch = await teamModel.findOne({ name, eventId });
        if (isMatch) {
            return res.status(400).json({
                error: 'team name already exists in this event'
            });
        }

        const teamCode = Math.random().toString(36).slice(2, 8).toUpperCase();

        const newTeam = await teamModel.create({
            name: name.trim(),
            eventId,
            leaderId: userId,
            members: [userId],
            teamCode
        });

        res.status(201).json({
            message: 'team created successfully',
            team: newTeam
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function joinTeam(req, res) {
    try {
        // POST /api/team/join

        const userId = req.user.id;
        const { teamCode } = req.body;

        if (!teamCode || !teamCode.trim()) {
            return res.status(400).json({ error: 'teamCode is required' });
        }

        const team = await teamModel.findOne({ teamCode: teamCode.trim().toUpperCase() });
        if (!team) {
            return res.status(404).json({ error: 'team not found' });
        }

        const event = await eventModel.findById(team.eventId);
        if (!event) {
            return res.status(404).json({ error: 'event not found' });
        }

        if (!event.isTeamEvent) {
            return res.status(400).json({
                error: 'this event is not team based'
            });
        }

        const existingTeam = await teamModel.findOne({
            eventId: team.eventId,
            members: userId
        });

        if (existingTeam) {
            return res.status(400).json({
                error: 'user already in a team for this event'
            });
        }

        if (event.maxTeamSize && team.members.length >= event.maxTeamSize) {
            return res.status(400).json({
                error: 'team is full'
            });
        }

        const reg = await regModel.findOne({
            eventId: team.eventId,
            userId
        });

        if (!reg) {
            return res.status(400).json({
                error: 'user must register for event first'
            });
        }

        const updatedTeam = await teamModel.findByIdAndUpdate(
            team._id,
            { $push: { members: userId } },
            { new: true }
        );

        res.status(200).json({
            message: 'joined team successfully',
            team: updatedTeam
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

async function removeMember(req, res) {
    try {
        const { teamId, userId: targetUserId } = req.params;
        const requesterId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(teamId)) {
            return res.status(400).json({ error: 'invalid team ID' });
        }

        if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).json({ error: 'invalid user ID' });
        }

        const team = await teamModel.findById(teamId);
        if (!team) {
            return res.status(404).json({ error: 'team not found' });
        }

        if (team.leaderId.toString() !== requesterId) {
            return res.status(403).json({
                error: 'only team leader can remove members'
            });
        }

        if (targetUserId === requesterId) {
            return res.status(400).json({
                error: 'leader cannot remove themselves'
            });
        }

        const isMember = team.members.some(
            (id) => id.toString() === targetUserId
        );

        if (!isMember) {
            return res.status(400).json({
                error: 'user is not part of this team'
            });
        }

        const updatedTeam = await teamModel.findByIdAndUpdate(
            teamId,
            { $pull: { members: targetUserId } },
            { new: true }
        );

        return res.status(200).json({
            message: 'member removed successfully',
            team: updatedTeam
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

async function getMyTeam(req, res) {
    try {
        const userId = req.user.id;

        const team = await teamModel
            .findOne({ members: userId })
            .populate('members', 'name email')
            .populate('leaderId', 'name');

        if (!team) {
            return res.status(200).json({
                message: 'user is not part of any team'
            });
        }

        res.status(200).json({
            team
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    };
};

module.exports = { removeMember, createTeam, joinTeam, getMyTeam };