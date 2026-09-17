const jwt = require('jsonwebtoken');

const getJwtSecret = () => process.env.JWT_SECRET || process.env.SECRET_KEY;

const issueAdminToken = (admin) => {
    const secret = getJwtSecret();
    if (!secret) throw new Error('JWT_SECRET or SECRET_KEY must be configured');

    return jwt.sign(
        { role: admin.role, email: admin.email },
        secret,
        { subject: String(admin._id), expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );
};

const verifyAdminToken = (token) => {
    const secret = getJwtSecret();
    if (!secret) throw new Error('JWT_SECRET or SECRET_KEY must be configured');
    return jwt.verify(token, secret);
};

module.exports = { issueAdminToken, verifyAdminToken };