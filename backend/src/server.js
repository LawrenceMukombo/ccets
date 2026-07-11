const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// Middleware
app.use(helmet()); // Security Headers
app.use(compression()); // Response Compression
app.use(cors());
app.use(express.json());

// Request logging (sanitized)
app.use((req, res, next) => {
    // Avoid logging sensitive body data like passwords
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '[REDACTED]';
    if (safeBody.token) safeBody.token = '[REDACTED]';

    console.log(`${req.method} ${req.path}`, safeBody);
    next();
});

const authRoutes = require('./routes/auth');
const facilityRoutes = require('./routes/facilities');
const ticketRoutes = require('./routes/tickets');
const userRoutes = require('./routes/users');
const groupRoutes = require('./routes/groups');
const permissionRoutes = require('./routes/permissions');
const auditRoutes = require('./routes/audit');
const equipmentRoutes = require('./routes/equipment');
const faultRoutes = require('./routes/faults');
const sparePartsRoutes = require('./routes/spareParts');
const notificationRoutes = require('./routes/notificationRoutes');
const dashboardRoutes = require('./routes/dashboard');
const koboRoutes = require('./routes/koboRoutes'); // ODK Integration

const resolveTenant = require('./middleware/tenant.middleware');

// Create a router for tenant-specific endpoints
const tenantRouter = express.Router({ mergeParams: true });
tenantRouter.use('/auth', authRoutes);
tenantRouter.use('/facilities', facilityRoutes);
tenantRouter.use('/tickets', ticketRoutes);
tenantRouter.use('/dashboard', dashboardRoutes);
tenantRouter.use('/users', userRoutes);
tenantRouter.use('/groups', groupRoutes);
tenantRouter.use('/permissions', permissionRoutes);
tenantRouter.use('/audit', auditRoutes);
tenantRouter.use('/equipment', equipmentRoutes);
tenantRouter.use('/faults', faultRoutes);
tenantRouter.use('/spare-parts', sparePartsRoutes);
tenantRouter.use('/notifications', notificationRoutes);
tenantRouter.use('/boundaries', require('./routes/boundaries'));
tenantRouter.use('/settings', require('./routes/settings'));
tenantRouter.use('/hooks/kobo', koboRoutes); // Mount ODK webhook

// ── Public tenant listing (no auth required — used by TenantPicker) ──────────
const db = require('./db');
app.get('/api/tenants', async (req, res) => {
    try {
        const result = await db.pool.query(
            `SELECT t.code, t.name, tc.emblem 
             FROM public.tenants t 
             LEFT JOIN public.tenant_config tc ON t.code = tc.tenant_code
             WHERE t.is_active = true 
             ORDER BY t.name`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error listing tenants:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Mount the tenant router with the resolveTenant middleware
app.use('/api/:tenantCode', resolveTenant, tenantRouter);

// Super-admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err);
    res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'CCETS Backend API is running' });
});

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for development
        methods: ["GET", "POST"]
    }
});

// Store io instance in app for access in controllers
app.set('io', io);

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join_user', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User ${userId} joined room user_${userId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start Server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
