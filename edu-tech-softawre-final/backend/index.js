
const express = require("express")
const cors = require("cors")
const mongoose = require("mongoose")
const dotenv = require("dotenv")
// const bodyParser = require("body-parser")
const app = express()
const Routes = require("./routes/route.js")
const settingsRoute = require("./routes/settings-route.js")
const employeeRoute = require("./routes/employee-route.js")
const attendanceLeaveRoute = require("./routes/attendance-leave-route.js")
const { getClientIP } = require("./utils/auditLogger")
const { apiLimiter } = require("./middleware/rateLimiter")
const requestAudit = require('./middleware/requestAudit');

const PORT = process.env.PORT || 5000

dotenv.config();

// app.use(bodyParser.json({ limit: '10mb', extended: true }))
// app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }))

app.use(express.json({ limit: '10mb' }))
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const ALLOWED_ORIGINS = [
    ...FRONTEND_URL.split(',').map((origin) => origin.trim()),
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
].filter(Boolean);
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-id', 'x-user-id', 'x-audit-module', 'x-audit-page', 'x-audit-endpoint', 'x-audit-action']
}))
app.disable('x-powered-by')

// Apply rate limiting to all API requests
app.use(apiLimiter)

// Audit middleware: capture client IP and user agent for audit logging
app.use((req, res, next) => {
    try {
        req.clientIP = getClientIP(req);
    } catch (e) {
        req.clientIP = 'Unknown';
    }
    req.userAgent = req.get('user-agent') || '';
    next();
});

app.use(requestAudit);

const MONGO_URI = process.env.MONGO_URL || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/schoolManagementSystem';

// Establish MongoDB connection using helper with retries/backoff
const { connectToMongo } = require('./utils/db');
const path = require('path');
const Admin = require('./models/adminSchema.js');
const School = require('./models/schoolSchema.js');
const { createDatabaseBackup } = require('./utils/backupService.js');
const { enforceSubscriptionStatus } = require('./middleware/schoolAccess.js');

const automaticBackupEnabled = process.env.AUTO_BACKUP_ENABLED !== 'false';
const automaticBackupIntervalMs = Number(process.env.AUTO_BACKUP_INTERVAL_MS) || 24 * 60 * 60 * 1000;

const enforceAllSubscriptionStatuses = async () => {
    const schools = await School.find({}).select('_id').lean();
    for (const school of schools) {
        await enforceSubscriptionStatus(school._id);
    }
};

const runAutomaticBackups = async () => {
    if (!automaticBackupEnabled || mongoose.connection.readyState !== 1) return;

    const schoolAdmins = await Admin.find({ role: 'Admin' }).select('_id').lean();
    for (const schoolAdmin of schoolAdmins) {
        const result = await createDatabaseBackup(
            schoolAdmin._id,
            'automatic',
            'full',
            schoolAdmin._id,
            'local'
        );

        if (!result.success) {
            console.error(`Automatic backup failed for school ${schoolAdmin._id}: ${result.error || result.message}`);
        }
    }
};

app.get('/', (req, res) => {
    res.send('School Management System backend is running.')
})

app.get('/health', (req, res) => {
    const dbState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    res.json({
        status: 'ok',
        db: states[dbState] || 'unknown'
    });
})

// Mount existing routes
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount settings routes at root so frontend can call /School/... directly
app.use('/', settingsRoute);
app.use('/', employeeRoute);
app.use('/', attendanceLeaveRoute);
app.use('/', Routes);

// Export app for testing. When run directly, start the server.
if (require.main === module) {
    // Start the server immediately so the login API remains available even when MongoDB is offline.
    const server = app.listen(PORT, () => {
        console.log(`Server started at port no. ${PORT}`)
    });

    connectToMongo(MONGO_URI)
        .then(() => {
            console.log('MongoDB connection established.');
            enforceAllSubscriptionStatuses().catch((err) => {
                console.error('Automatic subscription status check failed:', err.message || err);
            });

            const subscriptionTimer = setInterval(() => {
                enforceAllSubscriptionStatuses().catch((err) => {
                    console.error('Scheduled subscription status check failed:', err.message || err);
                });
            }, automaticBackupIntervalMs);
            subscriptionTimer.unref();

            if (automaticBackupEnabled) {
                runAutomaticBackups().catch((err) => {
                    console.error('Automatic startup backup failed:', err.message || err);
                });

                const backupTimer = setInterval(() => {
                    runAutomaticBackups().catch((err) => {
                        console.error('Automatic scheduled backup failed:', err.message || err);
                    });
                }, automaticBackupIntervalMs);
                backupTimer.unref();
                console.log(`Automatic backups enabled; interval: ${automaticBackupIntervalMs}ms`);
            }
        })
        .catch(err => {
            console.warn('MongoDB connection unavailable; continuing in fallback mode.', err.message || err);
        });

    process.on('SIGTERM', () => {
        server.close(() => process.exit(0));
    });

    process.on('SIGINT', () => {
        server.close(() => process.exit(0));
    });
}

module.exports = app;
