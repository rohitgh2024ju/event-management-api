import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { userModel, eventModel, teamModel, regModel } from '../models/model.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import express from 'express';
import mongoose from 'mongoose';
import QRCode from 'qrcode';
import { Parser } from 'json2csv';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

dotenv.config();

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    },
    connectionTimeout: 10000, 
    socketTimeout: 10000,
    family: 4 
});

export function sendMail(to, subject, html, attachments = []) {
    transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        html,
        attachments
    }).then(info => {
        console.log(`Email sent to ${to}: ${info.messageId}`);
    }).catch(err => {
        console.error(`Mail Error for ${to}:`, err.message);
    });
};

export async function regForEvent(req, res) {
    try {
        const eventId = req.params.id;
        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        const findEvent = await eventModel.findById(eventId);
        if (!findEvent) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const existing = await regModel.findOne({ userId, eventId });
        if (existing) {
            return res.status(400).json({ error: 'User already registered' });
        }

        const count = await regModel.countDocuments({
            eventId,
            status: 'approved'
        });

        if (count >= findEvent.maxParticipants) {
            return res.status(400).json({ error: 'Event is full' });
        }

        const qrToken = crypto.randomBytes(16).toString('hex');
        const qrImage = await QRCode.toDataURL(qrToken);

        const regUser = await regModel.create({
            userId,
            eventId,
            qrToken,
            status: 'pending'
        });

        userModel.findById(userId).then(user => {
            if (user) {
                transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject: `Registration Successful - ${findEvent.title}`,
                    html: `<h2>Registration Successful</h2><p>Hello ${user.name}...</p>`,
                    attachments: [{
                        filename: 'qr.png',
                        content: qrImage.split("base64,")[1],
                        encoding: 'base64'
                    }]
                }).catch(mailErr => console.log("Background Email failed:", mailErr.message));
            }
        }).catch(err => console.log("Background User lookup failed:", err.message));

        return res.status(201).json({
            message: 'Registration successful',
            registration: {
                id: regUser._id,
                status: regUser.status
            },
            qrToken,
            qrImage
        });

    } catch (err) {
        if (!res.headersSent) {
            return res.status(500).json({ error: err.message });
        }
    }
};

export async function myReg(req, res) {
    try {
        const userId = req.user.id;

        const regs = await regModel
            .find({ userId })
            .populate('eventId', 'title date isTeamEvent')
            .sort({ createdAt: -1 })
            .lean();

        if (!regs.length) {
            return res.status(200).json({
                message: 'No registrations yet'
            });
        }

        const formatted = regs.map(r => ({
            id: r._id,
            event: r.eventId
                ? {
                    id: r.eventId._id,
                    title: r.eventId.title,
                    date: r.eventId.date,
                    isTeamEvent: r.eventId.isTeamEvent
                }
                : null,
            status: r.status,
            attended: r.attended,
            createdAt: r.createdAt
        }));

        res.status(200).json({
            registrations: formatted
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function updateRegStatus(req, res) {
    try {
        const { id: regId } = req.params;
        const { status } = req.body;

        if (!mongoose.Types.ObjectId.isValid(regId)) {
            return res.status(400).json({ error: 'Invalid registration ID' });
        }

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({
                error: 'Status must be approved or rejected'
            });
        }

        const reg = await regModel.findById(regId);
        if (!reg) {
            return res.status(404).json({ error: 'Registration not found' });
        }

        if (reg.status !== 'pending') {
            return res.status(400).json({
                error: 'Status already updated'
            });
        }

        const event = await eventModel.findById(reg.eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (status === 'approved') {
            const approvedCount = await regModel.countDocuments({
                eventId: reg.eventId,
                status: 'approved'
            });

            if (approvedCount >= event.maxParticipants) {
                return res.status(400).json({
                    error: 'Event is already full'
                });
            }
        }

        reg.status = status;
        await reg.save();

        userModel.findById(reg.userId).then(user => {
            if (user) {
                const isApproved = status === 'approved';

                const subject = isApproved
                    ? `Registration Approved - ${event.title}`
                    : `Registration Rejected - ${event.title}`;

                const html = isApproved
                    ? `<h2>You're Approved!</h2>
               <p>Hello ${user.name},</p>
               <p>Your registration for <b>${event.title}</b> has been approved.</p>
               <p>Please keep your QR code ready for attendance.</p>
               <br/><p>See you at the event!</p>`
                    : `<h2>Registration Update</h2>
               <p>Hello ${user.name},</p>
               <p>We regret to inform you that your registration for <b>${event.title}</b> has been rejected.</p>
               <p>If you believe this was a mistake, please contact the organizers.</p>
               <br/><p>Thank you for your interest.</p>`;

                transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: user.email,
                    subject,
                    html,
                    text: html.replace(/<[^>]*>?/gm, '')
                }).catch(mailErr => console.log('Background Email failed:', mailErr.message));
            }
        }).catch(err => console.log('Background User lookup failed:', err.message));

        res.status(200).json({
            message: 'Status updated successfully',
            registration: {
                id: reg._id,
                status: reg.status
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export async function getAllRegistrations(req, res) {
    try {
        const { status, eventId, attended } = req.query;

        const filter = {};

        if (status !== undefined) {
            if (!['pending', 'approved', 'rejected'].includes(status)) {
                return res.status(400).json({
                    error: 'Invalid status filter'
                });
            }
            filter.status = status;
        }

        if (attended !== undefined) {
            if (!['true', 'false'].includes(attended)) {
                return res.status(400).json({
                    error: 'Invalid attended filter (true/false)'
                });
            }
            filter.attended = attended === 'true';
        }

        if (eventId !== undefined) {
            if (!mongoose.Types.ObjectId.isValid(eventId)) {
                return res.status(400).json({
                    error: 'Invalid event ID'
                });
            }
            filter.eventId = eventId;
        }

        const regs = await regModel
            .find(filter)
            .populate('userId', 'name email')
            .populate('eventId', 'title date isTeamEvent')
            .sort({ createdAt: -1 })
            .lean();

        const formatted = regs.map(r => ({
            id: r._id,
            user: r.userId
                ? {
                    id: r.userId._id,
                    name: r.userId.name,
                    email: r.userId.email
                }
                : null,
            event: r.eventId
                ? {
                    id: r.eventId._id,
                    title: r.eventId.title,
                    date: r.eventId.date,
                    isTeamEvent: r.eventId.isTeamEvent
                }
                : null,
            status: r.status,
            attended: r.attended,
            createdAt: r.createdAt
        }));

        res.status(200).json({
            registrations: formatted
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
};

export async function exportRegistrationsCSV(req, res) {
    try {
        const { status, eventId, attended } = req.query;

        const filter = {};

        if (status !== undefined) {
            if (!['pending', 'approved', 'rejected'].includes(status)) {
                return res.status(400).json({ error: 'Invalid status filter' });
            }
            filter.status = status;
        }

        if (attended !== undefined) {
            if (!['true', 'false'].includes(attended)) {
                return res.status(400).json({
                    error: 'Invalid attended filter (true/false)'
                });
            }
            filter.attended = attended === 'true';
        }

        if (eventId !== undefined) {
            if (!mongoose.Types.ObjectId.isValid(eventId)) {
                return res.status(400).json({ error: 'Invalid event ID' });
            }
            filter.eventId = eventId;
        }

        const regs = await regModel
            .find(filter)
            .populate('userId', 'name email')
            .populate('eventId', 'title date isTeamEvent')
            .sort({ createdAt: -1 })
            .lean();

        const data = regs.map(r => ({
            id: r._id.toString(),
            name: r.userId?.name || '',
            email: r.userId?.email || '',
            event: r.eventId?.title || '',
            eventDate: r.eventId?.date || '',
            isTeamEvent: r.eventId?.isTeamEvent ?? '',
            status: r.status,
            attended: r.attended,
            createdAt: r.createdAt
        }));

        const fields = [
            'id',
            'name',
            'email',
            'event',
            'eventDate',
            'isTeamEvent',
            'status',
            'attended',
            'createdAt'
        ];

        const parser = new Parser({ fields });
        const csv = parser.parse(data);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="registrations.csv"');
        res.status(200).send(csv);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export async function generateCertificates(req, res) {
    try {
        const { eventId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        const event = await eventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const regs = await regModel
            .find({
                eventId,
                status: 'approved',
                attended: true
            })
            .populate('userId', 'name email');

        if (!regs.length) {
            return res.status(200).json({
                message: 'No eligible users for certificates'
            });
        }

        res.status(202).json({
            message: `Certificate generation started for ${regs.length} users. Emails will be sent in the background.`
        });

        (async () => {
            console.log(`Starting background certificate generation for: ${event.title}`);

            for (const reg of regs) {
                const user = reg.userId;
                if (!user || !user.email) continue;

                try {
                    const pdfBuffer = await new Promise((resolve, reject) => {
                        const doc = new PDFDocument();
                        const buffers = [];
                        doc.on('data', chunk => buffers.push(chunk));
                        doc.on('end', () => resolve(Buffer.concat(buffers)));
                        doc.on('error', reject);

                        // Design (Simplified)
                        doc.fontSize(20).text('Certificate of Participation', { align: 'center' });
                        doc.moveDown().fontSize(18).text(user.name, { align: 'center' });
                        doc.moveDown().fontSize(16).text(event.title, { align: 'center' });
                        doc.end();
                    });

                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: user.email,
                        subject: `Certificate of Participation - ${event.title}`,
                        html: `<p>Hello ${user.name}, your certificate is attached!</p>`,
                        attachments: [{
                            filename: `${event.title}-certificate.pdf`,
                            content: pdfBuffer
                        }]
                    });

                    console.log(`Certificate sent to: ${user.email}`);
                } catch (err) {
                    console.error(`Failed for ${user.email}:`, err.message);
                }
            }
            console.log("All background certificates processed.");
        })();

    } catch (err) {
        if (!res.headersSent) {
            res.status(500).json({ error: err.message });
        }
    }
};

export async function eventAnalytics(req, res) {
    try {
        const { eventId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        const event = await eventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const {
            title,
            description,
            date,
            maxParticipants,
            maxTeams,
            maxTeamSize,
            isTeamEvent,
            createdBy,
            createdAt
        } = event;

        const [total, approved, rejected, attended] = await Promise.all([
            regModel.countDocuments({ eventId }),
            regModel.countDocuments({ eventId, status: 'approved' }),
            regModel.countDocuments({ eventId, status: 'rejected' }),
            regModel.countDocuments({ eventId, attended: true })
        ]);

        const spotsLeft = Math.max(maxParticipants - approved, 0);

        const attendanceRate = approved > 0
            ? ((attended / approved) * 100).toFixed(2) + '%'
            : '0%';

        const conversionRate = total > 0
            ? ((approved / total) * 100).toFixed(2) + '%'
            : '0%';

        const noShow = Math.max(approved - attended, 0);

        const fillRate = maxParticipants > 0
            ? ((approved / maxParticipants) * 100).toFixed(2) + '%'
            : '0%';

        let eventStatus = 'upcoming';

        if (new Date() > new Date(date)) {
            eventStatus = 'completed';
        } else if (approved >= maxParticipants) {
            eventStatus = 'full';
        }

        const teamCount = isTeamEvent
            ? await teamModel.countDocuments({ eventId })
            : null;

        const creator = await userModel.findById(createdBy, { name: 1 });

        return res.status(200).json({
            eventInfo: {
                title,
                description,
                date,
                isTeamEvent,
                maxTeams,
                maxTeamSize,
                maxParticipants,
                createdAt,
                createdBy: creator
                    ? { id: creator._id, name: creator.name }
                    : null
            },
            stats: {
                totalRegistrations: total,
                approved,
                rejected,
                attended,
                attendanceRate,
                conversionRate,
                noShow,
                spotsLeft,
                fillRate,
                isFull: spotsLeft <= 0,
                eventStatus,
                teamCount
            }
        });

    } catch (error) {
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};

export async function processScan(qrToken) {
    const userReg = await regModel
        .findOne({ qrToken })
        .populate('userId', 'name email')
        .populate('eventId', 'title date');

    if (!userReg) {
        return { status: 400, error: 'Invalid QR' };
    }

    if (userReg.status !== 'approved') {
        return { status: 400, error: 'User not approved' };
    }

    if (userReg.attended) {
        return { status: 200, message: 'Already marked attended' };
    }

    userReg.attended = true;
    await userReg.save();

    return {
        status: 200,
        message: 'Attendance marked successfully',
        user: userReg.userId,
        event: userReg.eventId
    };
};

export async function scanAttendance(req, res) {
    try {
        const { qrToken } = req.body;

        if (!qrToken) {
            return res.status(400).json({ error: 'QR token required' });
        }

        const result = await processScan(qrToken);

        return res.status(result.status).json(result);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
