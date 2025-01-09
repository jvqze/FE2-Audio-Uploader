import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
}

let cachedConnection: mongoose.Connection | null = null;

export default async function MongooseConnect(): Promise<mongoose.Connection> {
    if (cachedConnection && cachedConnection.readyState === 1) {
        return cachedConnection;
    }

    if (!cachedConnection) {
        try {
            const connection = await mongoose.connect(MONGODB_URI as string, {
                socketTimeoutMS: 45000,
                connectTimeoutMS: 10000,
                autoIndex:
                    process.env.VERCEL_ENV !== 'production' ||
                    process.env.NODE_ENV !== 'production',
            });
            cachedConnection = connection.connection;
            console.log('Mongoose connected successfully');
        } catch (err) {
            console.error('Mongoose connection error:', err);
            throw new Error('Database connection failed');
        }
    }

    return cachedConnection;
}
