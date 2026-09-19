
const sendEmail = async (to, subject, html) => {
    try {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            console.warn(`[EMAIL] Invalid email format: ${to}`);
            return { success: false, error: 'Invalid email format' };
        }

        const emailHost = process.env.EMAIL_HOST;
        const emailPort = Number(process.env.EMAIL_PORT) || 587;
        const emailUser = process.env.EMAIL_USER;
        const emailPass = process.env.EMAIL_PASS;
        const emailFrom = process.env.EMAIL_FROM || emailUser;

        const placeholderValues = [
            'your-smtp-host',
            'smtp.example.com',
            'your-email@example.com',
            'user@example.com',
            'your-email-password',
            'password',
            '123456',
        ];

        const isSmtpConfigured = emailHost && emailUser && emailPass &&
            !placeholderValues.includes(emailHost) &&
            !placeholderValues.includes(emailUser) &&
            !placeholderValues.includes(emailPass);

        if (isSmtpConfigured) {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransport({
                host: emailHost,
                port: emailPort,
                secure: emailPort === 465,
                auth: {
                    user: emailUser,
                    pass: emailPass,
                },
                // Add connection timeout and retry logic
                connectionTimeout: 10000,
                socketTimeout: 10000,
            });

            // Verify connection before sending
            try {
                await transporter.verify();
            } catch (verifyError) {
                console.warn(`[EMAIL] SMTP verification failed: ${verifyError.message}`);
                // Fall through to demo mode
                throw verifyError;
            }

            const info = await transporter.sendMail({
                from: emailFrom,
                to,
                subject,
                html,
            });

            console.log(`[EMAIL] Sent to ${to}: ${info.messageId}`);
            return { success: true, info };
        }

        console.log(`\n[EMAIL DEMO] To: ${to}`);
        console.log(`[EMAIL DEMO] Subject: ${subject}`);
        console.log(`[EMAIL DEMO] Body: ${html}`);
        return { success: true, demo: true, message: 'Email logged (configure SMTP for real email delivery)' };
    } catch (error) {
        console.error('[EMAIL ERROR]', error.message);
        // Return success: false to indicate delivery failed, but don't crash the application
        return { success: false, error: error.message };
    }
};

const sendResetPasswordLink = async (email, name, resetUrl) => {
    const subject = 'Password Reset Request';
    const html = `<p>Hi ${name || 'User'},</p><p>Click <a href="${resetUrl}">here</a> to reset your password. The link expires in one hour.</p><p>If you did not request a reset, ignore this message.</p>`;
    return await sendEmail(email, subject, html);
};

const sendAdminApprovalEmail = async (email, schoolName, loginUrl) => {
    const subject = 'Your School Registration Has Been Approved';
    const html = `
        <h2>Welcome to School Management System!</h2>
        <p>Hi ${schoolName},</p>
        <p>Your school registration has been <strong>approved by SuperAdmin</strong>. You can now access the school management system.</p>
        <p><strong>Login Details:</strong></p>
        <ul>
            <li>Email: ${email}</li>
            <li>Login URL: <a href="${loginUrl}">${loginUrl}</a></li>
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
        <p>Hi ${schoolName},</p>
        <p>Your school registration request has been <strong>rejected</strong> by SuperAdmin.</p>
        <p><strong>Reason:</strong> ${reason || 'Not specified'}</p>
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
        <p>Hi ${schoolName},</p>
        <p>Your school status has been updated to <strong>${status}</strong> by SuperAdmin.</p>
        <p><strong>Reason:</strong> ${reason || 'No reason provided'}</p>
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
        <p>Hi ${adminName},</p>
        <p>Your password has been reset by the SuperAdmin.</p>
        <p><strong>Your temporary password is:</strong> <code>${temporaryPassword}</code></p>
        <p><strong>Important:</strong> Please log in and change this password immediately for security reasons.</p>
        <p>If you did not request this password reset, please contact the SuperAdmin immediately.</p>
        <br/>
        <p>Best regards,<br/>School Management System</p>
    `;
    return await sendEmail(email, subject, html);
};

module.exports = { sendEmail, sendResetPasswordLink, sendAdminApprovalEmail, sendAdminRejectionEmail, sendSchoolStatusChangeEmail, sendPasswordResetEmail };
