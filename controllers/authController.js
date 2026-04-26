import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { userModel, eventModel, teamModel, regModel } from '../models/model.js';
import { adminMiddleware } from '../middlewares/adminMiddleware.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

dotenv.config();

dotenv.config();

export async function signup(req, res) {
    try {
        let { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                error: 'All fields are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Password must be at least 6 characters'
            });
        }

        email = email.toLowerCase();

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                error: 'User already exists'
            });
        }

        const salts = 10;
        const hashedPassword = await bcrypt.hash(password, salts);

        const user = await userModel.create({
            name,
            email,
            password: hashedPassword,
            role: 'user'
        });

        res.status(201).json({
            message: 'Signup successful',
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
}

export async function login(req, res) {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'Email and password are required'
            });
        }

        email = email.toLowerCase();

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.status(400).json({
                error: 'Invalid email or password'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({
                error: 'Invalid email or password'
            });
        }

        const token = jwt.sign(
            {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: '2h' }
        );

        res.cookie('jwtToken', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });

        res.status(200).json({
            message: 'Login successful'
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
}

export async function logout(req, res) {
    try {
        res.clearCookie('jwtToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        });
        res.status(200).json({
            message: 'account logged out'
        })
    } catch (err) {
        res.status(500).json({ error: err.message })
    }
};

export async function getMe(req, res) {
    try {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized'
            });
        }

        res.status(200).json({
            user: req.user
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
};

