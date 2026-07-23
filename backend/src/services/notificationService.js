const nodemailer = require('nodemailer');
const db = require('../db');
const https = require('https');
const querystring = require('querystring');

let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;

    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        return null;
    }

    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
    });
    return transporter;
};

const sendEmail = async (to, subject, html) => {
    if (!to) return;
    const mailTransporter = getTransporter();
    if (!mailTransporter) {
        console.log(`📧 [SIMULATED EMAIL] To: ${to} | Subject: ${subject} | (EMAIL_USER/EMAIL_PASS not set)`);
        return;
    }
    try {
        await mailTransporter.sendMail({
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
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (accountSid && authToken && fromNumber) {
        try {
            const postData = querystring.stringify({
                To: to,
                From: fromNumber,
                Body: message
            });

            const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
            const options = {
                hostname: 'api.twilio.com',
                port: 443,
                path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            await new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    let body = '';
                    res.on('data', (chunk) => body += chunk);
                    res.on('end', () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(JSON.parse(body));
                        } else {
                            reject(new Error(`Twilio returned status ${res.statusCode}: ${body}`));
                        }
                    });
                });
                req.on('error', reject);
                req.write(postData);
                req.end();
            });
            console.log(`📱 Real SMS sent via Twilio to ${to}`);
        } catch (error) {
            console.error(`❌ Failed to send SMS via Twilio to ${to}:`, error.message);
        }
    } else {
        console.log(`📱 [SIMULATED SMS] To: ${to} | Message: ${message}`);
    }
};

const sendWhatsApp = async (to, message) => {
    if (!to) return;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

    if (accountSid && authToken) {
        try {
            const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
            const formattedFrom = fromWhatsApp.startsWith('whatsapp:') ? fromWhatsApp : `whatsapp:${fromWhatsApp}`;

            const postData = querystring.stringify({
                To: formattedTo,
                From: formattedFrom,
                Body: message
            });

            const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
            const options = {
                hostname: 'api.twilio.com',
                port: 443,
                path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            await new Promise((resolve, reject) => {
                const req = https.request(options, (res) => {
                    let body = '';
                    res.on('data', (chunk) => body += chunk);
                    res.on('end', () => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(JSON.parse(body));
                        } else {
                            reject(new Error(`Twilio returned status ${res.statusCode}: ${body}`));
                        }
                    });
                });
                req.on('error', reject);
                req.write(postData);
                req.end();
            });
            console.log(`💬 Real WhatsApp sent via Twilio to ${to}`);
        } catch (error) {
            console.error(`❌ Failed to send WhatsApp via Twilio to ${to}:`, error.message);
        }
    } else {
        console.log(`💬 [SIMULATED WHATSAPP] To: ${to} | Message: ${message}`);
    }
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
        try {
            const tenantStore = require('../middleware/tenantStore');
            const tenant = tenantStore.getStore();
            const roomName = tenant && tenant.code ? `${tenant.code}_${userId}` : `user_${userId}`;
            
            io.to(roomName).emit('notification', {
                id: Date.now(),
                ticketId,
                type,
                message,
                timestamp: new Date()
            });
            console.log(`📡 Socket event emitted to ${roomName}`);
        } catch (err) {
            console.error('Failed to emit socket event:', err);
        }
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
