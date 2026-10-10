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

const VALID_EVENT_TYPES = [
    'ticket_created',
    'ticket_assigned',
    'ticket_reassigned',
    'ticket_escalated',
    'ticket_resolved',
    'ticket_work_started',
    'ticket_work_paused',
    'ticket_parts_requested',
    'ticket_edited',
    'ticket_deleted',
    'admin_message',
    'admin_test'
];

const normalizeEventType = (rawType) => {
    if (!rawType) return 'admin_message';
    const t = String(rawType).toLowerCase().trim();
    if (VALID_EVENT_TYPES.includes(t)) return t;
    if (t.includes('assign')) return 'ticket_assigned';
    if (t.includes('start')) return 'ticket_work_started';
    if (t.includes('pause')) return 'ticket_work_paused';
    if (t.includes('part')) return 'ticket_parts_requested';
    if (t.includes('escalat')) return 'ticket_escalated';
    if (t.includes('resolv') || t === 'closed') return 'ticket_resolved';
    if (t.includes('edit') || t.includes('update')) return 'ticket_edited';
    if (t.includes('creat')) return 'ticket_created';
    if (t.includes('delet')) return 'ticket_deleted';
    return 'admin_message';
};

const sendNotification = async (app, { userId, ticketId, type, message, email, phone, emailSubject, emailHtml }) => {
    console.log(`🔔 Sending notification to User ${userId} (${type}): ${message}`);

    const eventType = normalizeEventType(type);
    const parsedTicketId = ticketId ? parseInt(ticketId, 10) : null;
    let targetUserId = parseInt(userId, 10);

    // If userId was passed as string username or email, resolve to numeric user_id
    if (isNaN(targetUserId) && userId) {
        try {
            const uRes = await db.query(
                'SELECT user_id FROM users WHERE username = $1 OR email = $1 LIMIT 1',
                [String(userId).trim()]
            );
            if (uRes.rows.length > 0) {
                targetUserId = uRes.rows[0].user_id;
            }
        } catch (uErr) {
            console.warn('Could not resolve username to numeric user_id:', userId);
        }
    }

    if (!isNaN(targetUserId)) {
        // 0. Persist to Database with multi-tier schema tolerance
        let inserted = false;

        // Tier 1: Full insert with ticket_id and event_type
        if (parsedTicketId && !isNaN(parsedTicketId)) {
            try {
                await db.query(
                    `INSERT INTO notifications 
                    (recipient_user_id, ticket_id, event_type, message, notification_type, status, link, created_at, sent_on, is_read) 
                    VALUES ($1, $2, $3::public.notification_event_enum, $4, 'in_app', 'sent', $5, NOW(), NOW(), false)`,
                    [targetUserId, parsedTicketId, eventType, message, `/tickets/${parsedTicketId}`]
                );
                inserted = true;
            } catch (err1) {
                // Could be FK violation if ticket exists in tenant schema but not public
            }
        }

        // Tier 2: Without ticket_id FK (preserves link)
        if (!inserted) {
            try {
                await db.query(
                    `INSERT INTO notifications 
                    (recipient_user_id, event_type, message, notification_type, status, link, created_at, sent_on, is_read) 
                    VALUES ($1, $2::public.notification_event_enum, $3, 'in_app', 'sent', $4, NOW(), NOW(), false)`,
                    [targetUserId, eventType, message, parsedTicketId ? `/tickets/${parsedTicketId}` : null]
                );
                inserted = true;
            } catch (err2) {
                // Could be enum cast issue
            }
        }

        // Tier 3: Without explicit enum cast
        if (!inserted) {
            try {
                await db.query(
                    `INSERT INTO notifications 
                    (recipient_user_id, message, notification_type, status, link, created_at, sent_on, is_read) 
                    VALUES ($1, $2, 'in_app', 'sent', $3, NOW(), NOW(), false)`,
                    [targetUserId, message, parsedTicketId ? `/tickets/${parsedTicketId}` : null]
                );
                inserted = true;
            } catch (err3) {
                console.error('Error saving notification to DB:', err3.message);
            }
        }
    }

    // 1. In-App Notification (Socket.IO)
    const io = (app && typeof app.get === 'function') ? app.get('io') : null;
    if (io) {
        try {
            let tenantCode = '';
            try {
                const tenantStore = require('../middleware/tenantStore');
                const store = tenantStore.getStore();
                tenantCode = store?.code || '';
            } catch (tsErr) {
                // Non-fatal
            }

            const payload = {
                id: Date.now(),
                ticketId: parsedTicketId,
                type: eventType,
                message,
                link: parsedTicketId ? `/tickets/${parsedTicketId}` : null,
                timestamp: new Date()
            };

            // Broadcast to all room variants so client reliably receives it
            const rooms = new Set();
            if (targetUserId) {
                rooms.add(`${targetUserId}`);
                rooms.add(`user_${targetUserId}`);
                if (tenantCode) {
                    rooms.add(`${tenantCode}_${targetUserId}`);
                    rooms.add(`user_${tenantCode}_${targetUserId}`);
                }
            }
            if (userId && String(userId) !== String(targetUserId)) {
                rooms.add(`${userId}`);
                rooms.add(`user_${userId}`);
            }

            rooms.forEach(room => {
                io.to(room).emit('notification', payload);
            });
            console.log(`📡 Socket event emitted to rooms: ${Array.from(rooms).join(', ')}`);
        } catch (err) {
            console.error('Failed to emit socket event:', err);
        }
    }

    // 2. Email
    if (email) {
        const subject = emailSubject || `CCETS Notification: Ticket #${ticketId || ''} Update`;
        const baseUrl = process.env.APP_URL || 'http://localhost:5173';
        const linkUrl = parsedTicketId ? `${baseUrl}/tickets/${parsedTicketId}` : baseUrl;
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
