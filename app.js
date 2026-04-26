const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes.js');
const eventRoutes = require('./routes/eventRoutes.js');
const regRoutes = require('./routes/regRoutes.js');
const attendanceRoutes = require('./routes/attendanceRoutes.js');
const { connectDB } = require('./config/db.js')

const app = express();

app.use(express.json());
app.use(cookieParser());

connectDB();

app.use('/api', authRoutes);
app.use('/api', eventRoutes);
app.use('/api', regRoutes);
app.use('/api', attendanceRoutes);


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