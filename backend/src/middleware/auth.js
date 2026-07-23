const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Assert token tenant exists and matches URL tenant
        if (!req.tenant) {
            return res.status(400).json({ success: false, message: 'Tenant resolution context is required' });
        }

        if (!decoded.tenant_code || decoded.tenant_code.toLowerCase() !== req.tenant.code.toLowerCase()) {
            return res.status(403).json({ success: false, message: 'Cross-tenant token reuse is strictly forbidden' });
        }

        req.user = decoded;
        next();
    } catch (err) {
        // Distinguish error types so the frontend can act appropriately:
        // - TokenExpiredError  → session expired naturally, prompt re-login
        // - JsonWebTokenError  → malformed or tampered token
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                code: 'token_expired',
                message: 'Your session has expired. Please log in again.'
            });
        }
        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                code: 'token_invalid',
                message: 'Invalid authentication token.'
            });
        }
        // Unexpected JWT error — fail safely
        console.error('Unexpected JWT verification error:', err);
        return res.status(500).json({
            success: false,
            message: 'Authentication check failed. Please try again.'
        });
    }
};
