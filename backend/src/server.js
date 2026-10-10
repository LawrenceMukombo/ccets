const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// ── CORS configuration ────────────────────────────────────────────────────
// In production restrict to the known frontend origin; allow all in dev.
const corsOrigin = process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL || process.env.CORS_ORIGIN || process.env.APP_URL || true)
    : true;

const corsOptions = {
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

// Middleware
app.use(helmet()); // Security Headers
app.use(compression()); // Response Compression
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));

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
const rateLimit = require('./middleware/rateLimiter');

const authRateLimiter = rateLimit({ 
    windowMs: 60 * 1000, 
    max: 10, 
    message: 'Too many authentication attempts. Please try again after 1 minute.' 
});

const apiRateLimiter = rateLimit({ 
    windowMs: 60 * 1000, 
    max: 100,
    message: 'Too many requests. Please try again later.'
});

// Create a router for tenant-specific endpoints
const tenantRouter = express.Router({ mergeParams: true });

// Apply rate limiting
tenantRouter.use(apiRateLimiter);
tenantRouter.use('/auth/login', authRateLimiter);

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
tenantRouter.use('/reference-import', require('./routes/referenceImport'));
tenantRouter.use('/integration', require('./routes/integration'));
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

// Platform routes (deployment mode and context resolver)
const platformRoutes = require('./routes/platform');
app.use('/api/platform', platformRoutes);

// Super-admin routes
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// Global notifications route (allows /api/notifications as well as /api/:tenantCode/notifications)
const jwt = require('jsonwebtoken');
app.use('/api/notifications', (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    let targetCode = 'zambia';
    if (token) {
        try {
            const decoded = jwt.decode(token);
            if (decoded?.tenant_code) targetCode = decoded.tenant_code;
        } catch (e) {
            // Non-fatal
        }
    }
    req.params.tenantCode = targetCode;
    resolveTenant(req, res, () => {
        notificationRoutes(req, res, next);
    });
});

// Mount the tenant router with the resolveTenant middleware
app.use('/api/:tenantCode', resolveTenant, tenantRouter);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err);
    res.status(500).json({
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

const path = require('path');
const fs = require('fs');

// ── Serve Static Frontend (Merged Unified Application) ─────────────────────
const candidateBuildDirs = [
    path.join(__dirname, '../../build'),
    path.join(__dirname, '../../dist'),
    path.join(__dirname, '../frontend'),
    path.join(__dirname, '../../frontend')
];
const clientBuildPath = candidateBuildDirs.find(dir => fs.existsSync(dir));

if (clientBuildPath) {
    console.log(`Serving merged frontend build from: ${clientBuildPath}`);
    app.use(express.static(clientBuildPath));

    app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
            return next();
        }
        res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
} else {
    // Fallback root status if build directory is not found
    app.get('/', (req, res) => {
        res.json({ message: 'CCETS Backend API is running' });
    });
}

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        // Mirror the same origin policy used by Express CORS above
        origin: corsOrigin,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Store io instance in app for access in controllers
app.set('io', io);
const socketService = require('./services/socketService');
socketService.setIO(io);

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join_user', (identifier) => {
        const idStr = String(identifier || '').trim();
        if (!idStr) return;
        socket.join(idStr);
        socket.join(`user_${idStr}`);
        if (idStr.includes('_')) {
            const parts = idStr.split('_');
            const bareId = parts[parts.length - 1];
            socket.join(bareId);
            socket.join(`user_${bareId}`);
        }
        console.log(`User client ${socket.id} joined rooms for ${idStr}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

// Start Server
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
