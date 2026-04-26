import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const connectDB = async () => {
    const URL = process.env.MONGO_URL

    try {
        await mongoose.connect(URL);
        console.log('MongoDB connecting...');
        console.log('MongoDB is running!');
        
    } catch (err) {
        console.log('DB connection error: ', err.message);
    }
}