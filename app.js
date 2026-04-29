import express from 'express';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import regRoutes from './routes/regRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import teamRoutes from './routes/teamRoutes.js';
import { connectDB } from './config/db.js';
import cors from 'cors';


dotenv.config();

const app = express();

app.use(cors({ origin: "https://event-scanner-client.onrender.com", credentials: true }));
app.use(express.json());
app.use(cookieParser());

connectDB();

app.use('/api', authRoutes);
app.use('/api', eventRoutes);
app.use('/api', regRoutes);
app.use('/api', attendanceRoutes);
app.use('/api', teamRoutes);

app.get('/', (req, res) => {
  res.send('Event Management API is running...');
});

app.use((err, req, res, next) => {
  res.status(500).json({
    error: err.message
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});