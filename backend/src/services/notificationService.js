const nodemailer = require('nodemailer');
const db = require('../db');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendEmail = async (to, subject, html) => {
    if (!to) return;
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to,
            subject,
            html
        });
        console.log(`📧 Email sent to ${to}`);
    } catch (error) {
        console.error('❌ Email sending failed:', error);
    }
};

const sendSMS = async (to, message) => {
    if (!to) return;
    // Placeholder for Digicel/Twilio
    console.log(`📱 SMS would be sent to ${to}: ${message}`);
};

const sendWhatsApp = async (to, message) => {
    if (!to) return;
    // Placeholder for Twilio/Meta
    console.log(`💬 WhatsApp would be sent to ${to}: ${message}`);
};

const sendNotification = async (app, { userId, ticketId, type, message, email, phone, emailSubject, emailHtml }) => {
    console.log(`🔔 Sending notification to User ${userId} (${type})`);

    // 0. Persist to Database
    try {
        await db.query(
            `INSERT INTO notifications 
            (recipient_user_id, ticket_id, event_type, message, notification_type, status, link, created_at, sent_on, is_read) 
            VALUES ($1, $2, $3, $4, 'in_app', 'sent', $5, NOW(), NOW(), false)`,
            [userId, ticketId, type, message, ticketId ? `/tickets/${ticketId}` : null]
        );
    } catch (dbError) {
        console.error('Error saving notification to DB:', dbError.message);
    }

    // 1. In-App Notification (Socket.IO)
    const io = app.get('io');
    if (io) {
        io.to(`user_${userId}`).emit('notification', {
            id: Date.now(),
            ticketId,
            type,
            message,
            timestamp: new Date()
        });
        console.log(`📡 Socket event emitted to user_${userId}`);
    }

    // 2. Email
    if (email) {
        const subject = emailSubject || `CCETS Notification: Ticket #${ticketId} Update`;
        const baseUrl = process.env.APP_URL || 'http://localhost:5173';
        const linkUrl = `${baseUrl}/tickets/${ticketId}`;
        const html = emailHtml || `<p>${message}</p><p><a href="${linkUrl}">View Ticket</a></p>`;
        await sendEmail(email, subject, html);
    }

    // 3. SMS & WhatsApp (if phone provided)
    if (phone) {
        await sendSMS(phone, message);
        await sendWhatsApp(phone, message);
    }
};

module.exports = {
    sendNotification,
    sendEmail
};
