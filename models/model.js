const mongoose = require('mongoose');

// USER
const userSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { type: String, required: true },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    }
}, { timestamps: true });

const userModel = mongoose.model('user', userSchema);




// TEAM
const teamSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'event',
        required: true
    },
    leaderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }],
    teamCode: { type: String, required: true, trim: true }
}, { timestamps: true });

teamSchema.index({ name: 1, eventId: 1 }, { unique: true }); // indexing

const teamModel = mongoose.model('team', teamSchema);

// EVENT
const eventSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    maxParticipants: { type: Number, required: true },
    maxTeams: { type: Number },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }
}, { timestamps: true });

const eventModel = mongoose.model('event', eventSchema);

// REGISTRATION
const regSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'event',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    qrToken: {
        type: String,
        unique: true,
        trim: true
    },
    attended: {
        type: Boolean,
        default: false
    },
}, { timestamps: true });

const regModel = mongoose.model('reg', regSchema);


module.exports = {
    userModel,
    eventModel,
    teamModel,
    regModel
};