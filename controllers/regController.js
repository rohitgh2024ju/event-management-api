const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { userModel, eventModel, teamModel, regModel } = require('../models/model.js');
const { adminMiddleware } = require('../middlewares/adminMiddleware.js')
const { authMiddleware } = require('../middlewares/authMiddleware.js');
const { json } = require('express');
const { Schema, default: mongoose } = require('mongoose');
const QRCode = require('qrcode');
const { Parser } = require('json2csv');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const PDFDocument = require('pdfkit');


const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
})

async function sendMail(to, subject, text) {
    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to,
        subject,
        text
    })
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function regForEvent(req, res) {
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

        const user = await userModel.findById(userId);

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: `Registration Successful - ${findEvent.title}`,
            html: `
                <h2>Registration Successful</h2>
                <p>Hello ${user.name},</p>
                <p>You have successfully registered for <b>${findEvent.title}</b>.</p>
                <p>Status: Pending Approval</p>
                <p>Keep this QR code safe for attendance.</p>
                <img src="${qrImage}" alt="QR Code" />
                <br/>
                <p>Thank you!</p>
            `
        });

        res.status(201).json({
            message: 'Registration successful',
            registration: {
                id: regUser._id,
                status: regUser.status
            },
            qrToken,
            qrImage
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function myReg(req, res) {
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

async function updateRegStatus(req, res) {
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

        let event = await eventModel.findById(reg.eventId);
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

        const updatedReg = await regModel.findByIdAndUpdate(
            regId,
            { status },
            { new: true }
        );

        try {
            const user = await userModel.findById(reg.userId);

            if (user) {
                if (status === 'approved') {
                    await sendMail(
                        user.email,
                        `Registration Approved - ${event.title}`,
                        `
                        <h2>You're Approved!</h2>
                        <p>Hello ${user.name},</p>
                        <p>Your registration for <b>${event.title}</b> has been approved.</p>
                        <p>Please keep your QR code ready for attendance.</p>
                        <br/>
                        <p>See you at the event!</p>
                        `
                    );
                }

                if (status === 'rejected') {
                    await sendMail(
                        user.email,
                        `Registration Rejected - ${event.title}`,
                        `
                        <h2>Registration Update</h2>
                        <p>Hello ${user.name},</p>
                        <p>We regret to inform you that your registration for <b>${event.title}</b> has been rejected.</p>
                        <p>If you believe this was a mistake, please contact the organizers.</p>
                        <br/>
                        <p>Thank you for your interest.</p>
                        `
                    );
                }
            }

        } catch (err) {
            console.log('Email failed:', err.message);
        }

        res.status(200).json({
            message: 'Status updated successfully',
            registration: {
                id: updatedReg._id,
                status: updatedReg.status
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function getAllRegistrations(req, res) {
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

async function scanAttendance(req, res) {
    try {
        const { qrToken } = req.body;

        if (!qrToken) {
            return res.status(400).json({ error: 'QR token required' });
        }

        const userReg = await regModel
            .findOne({ qrToken })
            .populate('userId', 'name email')
            .populate('eventId', 'title date')
            .lean();

        if (!userReg) {
            return res.status(400).json({ error: 'Invalid QR' });
        }

        if (userReg.status !== 'approved') {
            return res.status(400).json({
                error: 'User not approved for this event'
            });
        }

        if (userReg.attended) {
            return res.status(200).json({
                message: 'Already marked attended'
            });
        }

        const updatedUserReg = await regModel.findOneAndUpdate(
            { qrToken },
            { attended: true },
            { new: true }
        ).lean();

        res.status(200).json({
            message: 'Attendance marked successfully',
            registration: {
                id: updatedUserReg._id,
                user: userReg.userId
                    ? {
                        id: userReg.userId._id,
                        name: userReg.userId.name,
                        email: userReg.userId.email
                    }
                    : null,
                event: userReg.eventId
                    ? {
                        id: userReg.eventId._id,
                        title: userReg.eventId.title,
                        date: userReg.eventId.date
                    }
                    : null,
                attended: updatedUserReg.attended
            }
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

async function exportRegistrationsCSV(req, res) {
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

async function generateCertificates(req, res) {
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

        for (const reg of regs) {
            const user = reg.userId;
            if (!user) continue;

            const doc = new PDFDocument();
            const buffers = [];

            doc.on('data', chunk => buffers.push(chunk));

            doc.on('end', async () => {
                const pdfBuffer = Buffer.concat(buffers);

                try {
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: user.email,
                        subject: `Certificate - ${event.title}`,
                        html: `
                            <h2>Congratulations ${user.name}</h2>
                            <p>You have successfully attended <b>${event.title}</b>.</p>
                        `,
                        attachments: [
                            {
                                filename: 'certificate.pdf',
                                content: pdfBuffer
                            }
                        ]
                    });
                } catch (err) {
                    console.log('Email failed:', err.message);
                }
            });

            doc.fontSize(20).text('Certificate of Participation', { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).text('This is to certify that', { align: 'center' });
            doc.moveDown();
            doc.fontSize(18).text(user.name, { align: 'center' });
            doc.moveDown();
            doc.fontSize(14).text('has successfully attended the event', { align: 'center' });
            doc.moveDown();
            doc.fontSize(16).text(event.title, { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Date: ${new Date(event.date).toDateString()}`, { align: 'center' });

            doc.end();
        }

        res.status(200).json({
            message: 'Certificates are being generated and sent'
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

async function eventAnalytics(req, res) {
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

module.exports = { updateRegStatus, regForEvent, myReg, getAllRegistrations, updateRegStatus, scanAttendance, exportRegistrationsCSV, generateCertificates, eventAnalytics }