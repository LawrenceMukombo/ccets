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
        res.status(401).json({ message: 'Token is not valid' });
    }
};
