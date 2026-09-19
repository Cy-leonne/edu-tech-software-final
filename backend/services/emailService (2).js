
const axios = require('axios');

// Escape user-controlled values that are embedded into HTML emails so that a
// school name / rejection reason can never inject markup or scripts.
const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mask secrets (e.g. password reset tokens) that may appear inside URLs so
// demo-mode logging never leaks them into production logs.
const maskSecrets = (value) => String(value ?? '').replace(/\b([0-9a-fA-F]{20,}|[A-Za-z0-9_-]{32,})\b/g, (m) => `${m.slice(0, 4)}…${m.slice(-4)}`);

// ---- Provider selection --------------------------------------------------
const PLACEHOLDERS = [
    'your-smtp-host',
    'smtp.example.com',
    'your-email@example.com',
    'user@example.com',
    'your-email-password',
    'password',
    '123456',
    'SG.your-sendgrid-api-key',
    'your-sendgrid-api-key',
];

const isPlaceholder = (value) => !value || PLACEHOLDERS.includes(value) || value.includes('your-') || value.includes('example.com');

const isSendGridConfigured = () => {
    const apiKey = process.env.SENDGRID_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_FROM_ADDRESS;
    return Boolean(
        apiKey &&
        !isPlaceholder(apiKey) &&
        emailFrom &&
        !isPlaceholder(emailFrom)
    );
};

const isSmtpConfiguredEnv = () => {
    const emailHost = process.env.EMAIL_HOST;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    return Boolean(
        emailHost && emailUser && emailPass &&
        !PLACEHOLDERS.includes(emailHost) &&
        !PLACEHOLDERS.includes(emailUser) &&
        !PLACEHOLDERS.includes(emailPass)
    );
};

const resolveProvider = () => {
    const requested = (process.env.EMAIL_PROVIDER || '').trim().toLowerCase();
    if (requested === 'demo') return 'demo';
    if (requested === 'sendgrid') return isSendGridConfigured() ? 'sendgrid' : 'demo';
    if (requested === 'smtp') return isSmtpConfiguredEnv() ? 'smtp' : 'demo';
    // auto: prefer sendgrid when configured, then smtp, otherwise demo
    if (isSendGridConfigured()) return 'sendgrid';
    if (isSmtpConfiguredEnv()) return 'smtp';
    return 'demo';
};

const sendViaSendGrid = async (to, subject, html) => {
    const apiKey = process.env.SENDGRID_API_KEY;
    const emailFrom = process.env.EMAIL_FROM || process.env.EMAIL_FROM_ADDRESS;
    const fromName = process.env.EMAIL_FROM_NAME || 'School Management System';
    const baseUrl = process.env.SENDGRID_API_BASE_URL || 'https://api.sendgrid.com/v3/mail/send';
    const url = /\/mail\/send$/.test(baseUrl) ? baseUrl : `${baseUrl.replace(/\/$/, '')}/v3/mail/send`;

    const payload = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: emailFrom, name: fromName },
        subject,
        content: [{ type: 'text/html', value: html }],
    };
    if (String(process.env.SENDGRID_SANDBOX_MODE || '').toLowerCase() === 'true') {
        payload.mail_settings = { sandbox_mode: { enable: true } };
    }

    const response = await axios.post(url, payload, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        timeout: 10000,
    });

    const messageId = response.headers && response.headers['x-message-id'];
    console.log(`[EMAIL] SendGrid sent to ${to}: ${messageId || response.status}`);
    return { success: true, provider: 'sendgrid', messageId };
};

const sendViaSmtp = async (to, subject, html) => {
    const emailHost = process.env.EMAIL_HOST;
    const emailPort = Number(process.env.EMAIL_PORT) || 587;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    const emailFrom = process.env.EMAIL_FROM || emailUser;

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465,
        auth: {
            user: emailUser,
            pass: emailPass,
        },
        connectionTimeout: 10000,
        socketTimeout: 10000,
    });

    await transporter.verify();

    const info = await transporter.sendMail({
        from: emailFrom,
        to,
        subject,
        html,
    });

    console.log(`[EMAIL] Sent to ${to}: ${info.messageId}`);
    return { success: true, provider: 'smtp', info };
};

const sendViaDemo = async (to, subject, html) => {
    console.log(`\n[EMAIL DEMO] To: ${to}`);
    console.log(`[EMAIL DEMO] Subject: ${subject}`);
    console.log(`[EMAIL DEMO] Body: ${maskSecrets(html)}`);
    return { success: true, provider: 'demo', demo: true, message: 'Email logged (configure SendGrid or SMTP for real email delivery)' };
};

const sendEmail = async (to, subject, html) => {
    try {
        // Validate email format before touching any provider
        if (!emailRegex.test(to)) {
            console.warn(`[EMAIL] Invalid email format: ${to}`);
            return { success: false, error: 'Invalid email format' };
        }

        const provider = resolveProvider();

        if (provider === 'sendgrid') {
            try {
                return await sendViaSendGrid(to, subject, html);
            } catch (deliveryError) {
                // Never expose provider internals (API keys, URLs) to callers.
                console.error('[EMAIL ERROR] SendGrid delivery failed:', deliveryError.message);
                return { success: false, error: 'Email delivery failed' };
            }
        }

        if (provider === 'smtp') {
            try {
                return await sendViaSmtp(to, subject, html);
            } catch (smtpError) {
                console.warn(`[EMAIL] SMTP delivery failed: ${smtpError.message}`);
                // fall through to demo so the flow is never blocked
            }
        }

        return await sendViaDemo(to, subject, html);
    } catch (error) {
        console.error('[EMAIL ERROR]', error.message);
        // Return success: false to indicate delivery failed, but don't crash the application
        return { success: false, error: error.message };
    }
};


const sendResetPasswordLink = async (email, name, resetUrl) => {
    const subject = 'Password Reset Request';
    const html = `<p>Hi ${escapeHtml(name || 'User')},</p><p>Click <a href="${escapeHtml(resetUrl)}">here</a> to reset your password. The link expires in one hour.</p><p>If you did not request a reset, ignore this message.</p>`;
    return await sendEmail(email, subject, html);
};

const sendAdminApprovalEmail = async (email, schoolName, loginUrl) => {
    const subject = 'Your School Registration Has Been Approved';
    const html = `
        <h2>Welcome to School Management System!</h2>
        <p>Hi ${escapeHtml(schoolName)},</p>
        <p>Your school registration has been <strong>approved by SuperAdmin</strong>. You can now access the school management system.</p>
        <p><strong>Login Details:</strong></p>
        <ul>
            <li>Email: ${email}</li>
            <li>Login URL: <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a></li>
        </ul>
        <p>Please log in with the password you registered with.</p>
        <p>If you have any questions, please contact the SuperAdmin.</p>
        <br/>
        <p>Best regards,<br/>School Management System</p>
    `;
    return await sendEmail(email, subject, html);
};

const sendAdminRejectionEmail = async (email, schoolName, reason) => {
    const subject = 'School Registration Status Update';
    const html = `
        <h2>School Management System</h2>
        <p>Hi ${escapeHtml(schoolName)},</p>
        <p>Your school registration request has been <strong>rejected</strong> by SuperAdmin.</p>
        <p><strong>Reason:</strong> ${escapeHtml(reason || 'Not specified')}</p>
        <p>Please contact the SuperAdmin for more information.</p>
        <br/>
        <p>Best regards,<br/>School Management System</p>
    `;
    return await sendEmail(email, subject, html);
};

const sendSchoolStatusChangeEmail = async (email, schoolName, status, reason) => {
    const subject = `School Status Updated: ${status}`;
    const html = `
        <h2>School Management System</h2>
        <p>Hi ${escapeHtml(schoolName)},</p>
        <p>Your school status has been updated to <strong>${escapeHtml(status)}</strong> by SuperAdmin.</p>
        <p><strong>Reason:</strong> ${escapeHtml(reason || 'No reason provided')}</p>
        <p>If you have questions about this decision, please contact the SuperAdmin.</p>
        <br/>
        <p>Best regards,<br/>School Management System</p>
    `;
    return await sendEmail(email, subject, html);
};

const sendPasswordResetEmail = async (email, adminName, temporaryPassword) => {
    const subject = 'Password Reset by SuperAdmin';
    const html = `
        <h2>Password Reset Notification</h2>
        <p>Hi ${escapeHtml(adminName)},</p>
        <p>Your password has been reset by the SuperAdmin.</p>
        <p><strong>Your temporary password is:</strong> <code>${temporaryPassword}</code></p>
        <p><strong>Important:</strong> Please log in and change this password immediately for security reasons.</p>
        <p>If you did not request this password reset, please contact the SuperAdmin immediately.</p>
        <br/>
        <p>Best regards,<br/>School Management System</p>
    `;
    return await sendEmail(email, subject, html);
};

module.exports = { sendEmail, sendResetPasswordLink, sendAdminApprovalEmail, sendAdminRejectionEmail, sendSchoolStatusChangeEmail, sendPasswordResetEmail, isSendGridConfigured, resolveProvider, escapeHtml };
