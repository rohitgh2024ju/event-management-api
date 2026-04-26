const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { userModel, eventModel, teamModel, regModel } = require('../models/model.js');
const { adminMiddleware } = require('../middlewares/adminMiddleware.js')
const { authMiddleware } = require('../middlewares/authMiddleware.js');
const { json } = require('express');
const { Schema } = require('mongoose');
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

        const count = await regModel.countDocuments({ eventId, status: 'approved' })

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
        const regs = await regModel.find({ userId }).populate('eventId', 'title date').sort({ createdAt: -1 }).lean();

        if (regs.length === 0) return res.status(200).json({ message: 'No registrations yet' });

        res.status(200).json({
            registrations: regs
        })
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


async function updateRegStatus(req, res) {
    try {
        const regId = req.params.id;
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

        let event = null;

        if (status === 'approved') {
            event = await eventModel.findById(reg.eventId);

            if (!event) {
                return res.status(404).json({ error: 'Event not found' });
            }

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

            if (!event) {
                event = await eventModel.findById(reg.eventId);
            }

            if (user && event) {
                if (status === 'approved') {
                    await sendMail(
                        user.email,
                        'Registration Approved',
                        `You are approved for ${event.title}`
                    );
                }

                if (status === 'rejected') {
                    await sendMail(
                        user.email,
                        'Registration Rejected',
                        `Sorry, your registration for ${event.title} was rejected`
                    );
                }
            }

        } catch (err) {
            console.log('Email failed:', err.message);
        }

        res.status(200).json({
            message: 'Status updated successfully',
            updatedReg
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}


async function getAllRegistrations(req, res) {
    try {
        const { status, eventId, attended } = req.query;

        let filter = {};

        if (status) {
            if (!['pending', 'approved', 'rejected'].includes(status)) {
                return res.status(400).json({
                    error: 'Invalid status filter'
                });
            }
            filter.status = status;
        }

        if (attended) {
            if (!['true', 'false'].includes(status)) {
                return res.status(400).json({
                    error: 'Invalid status filter (true/false)'
                });
            }
            filter.attended = attended === 'true';
        }

        if (eventId) {
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
            .populate('eventId', 'title date')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            registrations: regs
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

        const userReg = await regModel.findOne({ qrToken });

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
        );

        res.status(200).json({
            message: 'Attendance marked successfully',
            user: updatedUserReg
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


async function exportRegistrationsCSV(req, res) {
    try {
        const { status, eventId, attended } = req.query;

        let filter = {};

        if (status) {
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

        if (eventId) {
            if (!mongoose.Types.ObjectId.isValid(eventId)) {
                return res.status(400).json({ error: 'Invalid event ID' });
            }
            filter.eventId = eventId;
        }

        const regs = await regModel
            .find(filter)
            .populate('userId', 'name email')
            .populate('eventId', 'title date')
            .lean();

        const data = regs.map(r => ({
            name: r.userId?.name || '',
            email: r.userId?.email || '',
            event: r.eventId?.title || '',
            date: r.eventId?.date || '',
            status: r.status,
            attended: r.attended
        }));

        const parser = new Parser();
        const csv = parser.parse(data);

        res.header('Content-Type', 'text/csv');
        res.attachment('registrations.csv');
        res.send(csv);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


async function generateCertificates(req, res) {
    try {
        const eventId = req.params.eventId;

        if (!mongoose.Types.ObjectId.isValid(eventId)) {
            return res.status(400).json({ error: 'Invalid event ID' });
        }

        // 🔍 find event
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

        if (regs.length === 0) {
            return res.status(200).json({
                message: 'No eligible users for certificates'
            });
        }

        for (const reg of regs) {
            const user = reg.userId;

            if (!user) continue;

            const doc = new PDFDocument();
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));

            doc.on('end', async () => {
                const pdfBuffer = Buffer.concat(buffers);

                try {
                    await transporter.sendMail({
                        from: process.env.EMAIL_USER,
                        to: user.email,
                        subject: 'Certificate of Participation',
                        text: `Congratulations ${user.name}! You have successfully attended ${event.title}.`,
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

            doc.fontSize(20).text('Certificate of Participation', {
                align: 'center'
            });

            doc.moveDown();

            doc.fontSize(14).text(
                `This is to certify that`,
                { align: 'center' }
            );

            doc.moveDown();

            doc.fontSize(18).text(
                user.name,
                { align: 'center' }
            );

            doc.moveDown();

            doc.fontSize(14).text(
                `has successfully attended the event`,
                { align: 'center' }
            );

            doc.moveDown();

            doc.fontSize(16).text(
                event.title,
                { align: 'center' }
            );

            doc.moveDown();

            doc.fontSize(12).text(
                `Date: ${event.date.toDateString()}`,
                { align: 'center' }
            );

            doc.end();
        }

        res.status(200).json({
            message: 'Certificates are being generated and sent via email'
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { updateRegStatus, regForEvent, myReg, getAllRegistrations, updateRegStatus, scanAttendance, exportRegistrationsCSV, generateCertificates }