/**
 * Email delivery service.
 *
 * Supported providers (selected through EMAIL_PROVIDER, default "auto"):
 *   - sendgrid : SendGrid Web API v3 (https://api.sendgrid.com/v3/mail/send)
 *   - smtp     : SMTP relay through nodemailer (pre-existing behaviour)
 *   - demo     : no provider configured – the message is written to the server
 *                log with sensitive values masked (never the raw reset link)
 *
 * "auto" prefers SendGrid when SENDGRID_API_KEY is present, otherwise SMTP when
 * EMAIL_HOST/EMAIL_USER/EMAIL_PASS are present, otherwise demo mode.
 *
 * Note: SendGrid is an email delivery service only. No "SendGrid SMS" is
 * implemented; SMS keeps using the existing SMS provider (see smsService.js).
 */

const axios = require('axios');
const { maskResetLinks, maskToken } = require('../utils/passwordReset');

const SENDGRID_ENDPOINT = 'https://api.sendgrid.com/v3/mail/send';

const PLACEHOLDER_VALUES = [
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

const isMeaningful = (value) => Boolean(value) && !PLACEHOLDER_VALUES.includes(String(value).trim());

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

/** Escapes user supplied values before they are interpolated into HTML emails. */
const escapeHtml = (value) =>
    String(value === undefined || value === null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const getSendGridConfig = () => {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_USER;
    const fromName = process.env.EMAIL_FROM_NAME || 'School Management System';
    const baseUrl = (process.env.SENDGRID_API_BASE_URL || SENDGRID_ENDPOINT).trim();
    const sandboxMode = ['1', 'true', 'yes', 'on'].includes(String(process.env.SENDGRID_SANDBOX_MODE || '').toLowerCase());
    return { apiKey, fromEmail, fromName, baseUrl, sandboxMode };
};

const getSmtpConfig = () => ({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
});

const isSendGridConfigured = () => {
    const { apiKey, fromEmail } = getSendGridConfig();
    return isMeaningful(apiKey) && isMeaningful(fromEmail) && isValidEmail(fromEmail);
};

const isSmtpConfigured = () => {
    const { host, user, pass } = getSmtpConfig();
    return isMeaningful(host) && isMeaningful(user) && isMeaningful(pass);
};

const resolveProvider = () => {
    const requested = String(process.env.EMAIL_PROVIDER || 'auto').trim().toLowerCase();
    if (requested === 'sendgrid') return isSendGridConfigured() ? 'sendgrid' : 'demo';
    if (requested === 'smtp') return isSmtpConfigured() ? 'smtp' : 'demo';
    if (requested === 'demo' || requested === 'none') return 'demo';
    if (isSendGridConfigured()) return 'sendgrid';
    if (isSmtpConfigured()) return 'smtp';
    return 'demo';
};

/** Sends an email through the SendGrid Web API v3. */
const sendWithSendGrid = async ({ to, subject, html }) => {
    const { apiKey, fromEmail, fromName, baseUrl, sandboxMode } = getSendGridConfig();

    const payload = {
        personalizations: [{ to: [{ email: to }] }],
        from: { email: fromEmail, name: fromName },
        subject,
        content: [{ type: 'text/html', value: html }],
    };

    if (process.env.EMAIL_REPLY_TO && isValidEmail(process.env.EMAIL_REPLY_TO)) {
        payload.reply_to = { email: process.env.EMAIL_REPLY_TO };
    }

    if (sandboxMode) {
        payload.mail_settings = { sandbox_mode: { enable: true } };
    }

    const response = await axios.post(baseUrl, payload, {
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        timeout: 10000,
        validateStatus: (status) => status >= 200 && status < 300,
    });

    return {
        messageId: response.headers?.['x-message-id'] || '',
        statusCode: response.status,
    };
};

/** Sends an email through an SMTP relay (pre-existing behaviour). */
const sendWithSmtp = async ({ to, subject, html }) => {
    const { host, port, user, pass, from } = getSmtpConfig();
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
        connectionTimeout: 10000,
        socketTimeout: 10000,
    });

    await transporter.verify();
    const info = await transporter.sendMail({ from, to, subject, html });
    return { messageId: info.messageId, statusCode: 250 };
};

const sendEmail = async (to, subject, html) => {
    try {
        if (!isValidEmail(to)) {
            console.warn('[EMAIL] Rejected invalid recipient address');
            return { success: false, error: 'Invalid email format' };
        }

        const provider = resolveProvider();

        if (provider === 'sendgrid') {
            const { messageId, statusCode } = await sendWithSendGrid({ to, subject, html });
            console.log(`[EMAIL] SendGrid accepted message for delivery (status ${statusCode}, id ${messageId || 'n/a'})`);
            return { success: true, provider: 'sendgrid', messageId };
        }

        if (provider === 'smtp') {
            const { messageId } = await sendWithSmtp({ to, subject, html });
            console.log(`[EMAIL] SMTP delivered message ${messageId}`);
            return { success: true, provider: 'smtp', messageId };
        }

        // Demo / diagnostics mode: log a redacted copy so reset tokens never
        // end up in log files.
        console.log('\n[EMAIL DEMO] No email provider configured (EMAIL_PROVIDER / SENDGRID_API_KEY / EMAIL_HOST).');
        console.log(`[EMAIL DEMO] To: ${to}`);
        console.log(`[EMAIL DEMO] Subject: ${subject}`);
        console.log(`[EMAIL DEMO] Body (tokens masked): ${maskResetLinks(html).slice(0, 2000)}\n`);
        return {
            success: true,
            provider: 'demo',
            demo: true,
            message: 'Email logged (configure EMAIL_PROVIDER=sendgrid with SENDGRID_API_KEY for real delivery)',
        };
    } catch (error) {
        // Provider errors can contain the failed URL (including tokens) – never
        // return them to the caller, only log a provider level message.
        console.error('[EMAIL ERROR]', maskResetLinks(error.message || 'unknown error'));
        return { success: false, error: 'Email delivery failed' };
    }
};

const sendResetPasswordLink = async (email, name, resetUrl) => {
    const subject = 'Password Reset Request';
    const safeName = escapeHtml(name || 'User');
    const safeUrl = String(resetUrl || '');
    const html = `
        <p>Hi ${safeName},</p>
        <p>We received a request to reset your password. Click the link below to choose a new password.</p>
        <p><a href="${safeUrl}">Reset your password</a></p>
        <p>This link expires in one hour and can only be used once.</p>
        <p>If you did not request a password reset, you can safely ignore this email — your password will not change.</p>
    `;
    return await sendEmail(email, subject, html);
};

const sendAdminApprovalEmail = async (email, schoolName, loginUrl) => {
    const subject = 'Your School Registration Has Been Approved';
    const safeSchoolName = escapeHtml(schoolName);
    const safeLoginUrl = String(loginUrl || '');
    const html = `
        <h2>Welcome to School Management System!</h2>
        <p>Hi ${safeSchoolName},</p>
        <p>Your school registration has been <strong>approved by SuperAdmin</strong>. You can now access the school management system.</p>
        <p><strong>Login Details:</strong></p>
        <ul>
            <li>Email: ${escapeHtml(email)}</li>
            <li>Login URL: <a href="${safeLoginUrl}">${safeLoginUrl}</a></li>
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
        <p><strong>Your temporary password is:</strong> <code>${escapeHtml(temporaryPassword)}</code></p>
        <p><strong>Important:</strong> Please log in and change this password immediately for security reasons.</p>
        <p>If you did not request this password reset, please contact the SuperAdmin immediately.</p>
        <br/>
        <p>Best regards,<br/>School Management System</p>
    `;
    return await sendEmail(email, subject, html);
};

const sendPasswordChangedEmail = async (email, name) => {
    const subject = 'Your password was changed';
    const html = `
        <h2>Password changed</h2>
        <p>Hi ${escapeHtml(name || 'User')},</p>
        <p>This is a confirmation that the password for your account was just reset.</p>
        <p>If this was not you, contact your school administrator immediately.</p>
        <p>Sign in with your new password to continue.</p>
        <br/>
        <p>Best regards,<br/>School Management System</p>
    `;
    return await sendEmail(email, subject, html);
};

module.exports = {
    sendEmail,
    sendResetPasswordLink,
    sendAdminApprovalEmail,
    sendAdminRejectionEmail,
    sendSchoolStatusChangeEmail,
    sendPasswordResetEmail,
    sendPasswordChangedEmail,
    // Exported for diagnostics/testing only
    resolveProvider,
    isSendGridConfigured,
    isSmtpConfigured,
    escapeHtml,
    maskToken,
};
