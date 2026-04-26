import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { userModel, eventModel, teamModel, regModel } from '../models/model.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import express from 'express';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export async function createTeam(req, res) {
    try {
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
            return res.status(400).json({ error: 'this event is not team based' });
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

        const isMatch = await teamModel.findOne({ name: name.trim(), eventId });
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

        try {
            const user = await userModel.findById(userId);

            if (user) {
                const html = `
                    <h2>🎉 Team Created Successfully!</h2>
                    <p>Hello ${user.name},</p>
                    <p>Congratulations! You have created a team for <b>${event.title}</b>.</p>
                    
                    <p><b>Team Name:</b> ${newTeam.name}</p>
                    <p><b>Team Code:</b> ${teamCode}</p>

                    <p>Share this team code with your teammates so they can join.</p>
                    <br/>
                    <p>Best of luck for the event 🚀</p>
                `;
                console.log("Sending team creation email...");

                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: `Team Created - ${event.title}`,
                    html,
                    text: html.replace(/<[^>]*>?/gm, '')
                });
            }
        } catch (mailErr) {
            console.log('Team creation email failed:', mailErr.message);
        }

        res.status(201).json({
            message: 'team created successfully',
            team: newTeam
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function joinTeam(req, res) {
    try {
        const userId = req.user.id;
        const { teamCode } = req.body;

        if (!teamCode || !teamCode.trim()) {
            return res.status(400).json({ error: 'teamCode is required' });
        }

        const team = await teamModel.findOne({
            teamCode: teamCode.trim().toUpperCase()
        });

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
            { $addToSet: { members: userId } },
            { new: true }
        );

        try {
            const user = await userModel.findById(userId);
            const leader = await userModel.findById(team.leaderId);

            if (user) {
                const html = `
                    <h2>🎉 Joined Team Successfully</h2>
                    <p>Hello ${user.name},</p>
                    <p>You have joined the team <b>${team.name}</b> for <b>${event.title}</b>.</p>
                    <p><b>Team Code:</b> ${team.teamCode}</p>
                    <br/>
                    <p>Best of luck 🚀</p>
                `;

                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: `Joined Team - ${event.title}`,
                    html,
                    text: html.replace(/<[^>]*>?/gm, '')
                });
            }

            if (leader) {
                const html = `
                    <h2>👥 New Member Joined</h2>
                    <p>Hello ${leader.name},</p>
                    <p><b>${user.name}</b> has joined your team <b>${team.name}</b>.</p>
                    <br/>
                    <p>Keep building your team</p>
                `;

                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: leader.email,
                    subject: `New Member Joined - ${team.name}`,
                    html,
                    text: html.replace(/<[^>]*>?/gm, '')
                });
            }

        } catch (mailErr) {
            console.log('Join team email failed:', mailErr.message);
        }

        res.status(200).json({
            message: 'joined team successfully',
            team: updatedTeam
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function removeMember(req, res) {
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

        try {
            const removedUser = await userModel.findById(targetUserId);
            const leader = await userModel.findById(requesterId);
            const event = await eventModel.findById(team.eventId);

            if (removedUser) {
                const html = `
                    <h2>⚠️ Removed from Team</h2>
                    <p>Hello ${removedUser.name},</p>
                    <p>You have been removed from the team <b>${team.name}</b> for <b>${event.title}</b>.</p>
                    <br/>
                    <p>If this was unexpected, please contact your team leader.</p>
                `;

                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: removedUser.email,
                    subject: `Removed from Team - ${team.name}`,
                    html,
                    text: html.replace(/<[^>]*>?/gm, '')
                });
            }

            if (leader) {
                const html = `
                    <h2>Member Removed</h2>
                    <p>Hello ${leader.name},</p>
                    <p>You have successfully removed a member from your team <b>${team.name}</b>.</p>
                `;

                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: leader.email,
                    subject: `Member Removed - ${team.name}`,
                    html,
                    text: html.replace(/<[^>]*>?/gm, '')
                });
            }

        } catch (mailErr) {
            console.log('Remove member email failed:', mailErr.message);
        }

        return res.status(200).json({
            message: 'member removed successfully',
            team: updatedTeam
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}

export async function getMyTeam(req, res) {
    try {
        const userId = req.user.id;

        const team = await teamModel
            .findOne({ members: userId })
            .populate('members', 'name email')
            .populate('leaderId', 'name')
            .lean();

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
    }
};

