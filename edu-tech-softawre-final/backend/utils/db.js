
const mongoose = require('mongoose');

/**
 * Connect to MongoDB with retries and exponential backoff
 * @param {string} uri
 * @param {object} options
 */
const ensureAdminSchoolIndexes = async () => {
    try {
        if (!mongoose.connection.db) return;
        const adminsCollection = mongoose.connection.db.collection('admins');
        const indexes = await adminsCollection.listIndexes().toArray();
        const schoolNameIndex = indexes.find((index) => index.name === 'schoolName_1');
        if (schoolNameIndex) {
            await adminsCollection.dropIndex('schoolName_1');
            console.log('Dropped legacy schoolName_1 index from admins collection');
        }
    } catch (err) {
        console.warn('Unable to reconcile admin schoolName indexes:', err.message || err);
    }
};

const connectToMongo = async (uri, options = {}) => {
    const maxRetries = options.maxRetries || 5;
    const baseDelay = options.baseDelayMs || 1000; // 1s

    let attempt = 0;

    const connect = async () => {
        attempt += 1;
        try {
            await mongoose.connect(uri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                ...options.mongoose
            });
            console.log(`Connected to MongoDB (${uri})`);
            await ensureAdminSchoolIndexes();
            return true;
        } catch (err) {
            console.error(`MongoDB connection attempt ${attempt} failed:`, err.message || err);
            if (attempt >= maxRetries) {
                console.error('Max MongoDB connection attempts reached.');
                throw err;
            }

            const delay = baseDelay * Math.pow(2, attempt - 1);
            console.log(`Retrying MongoDB connection in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            return connect();
        }
    };

    const result = await connect();

    // Graceful shutdown
    const gracefulExit = () => {
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed through app termination');
            process.exit(0);
        });
    };

    process.on('SIGINT', gracefulExit);
    process.on('SIGTERM', gracefulExit);

    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected.');
    });

    return result;
};

module.exports = {
    connectToMongo,
    mongooseConnection: mongoose.connection,
};
