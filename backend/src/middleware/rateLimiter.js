const rateLimit = (options = {}) => {
    const windowMs = options.windowMs || 60 * 1000; // default 1 minute
    const maxLimit = options.max || 10; // default 10 requests per window
    const message = options.message || 'Too many requests. Please try again later.';

    const ipRequestStore = new Map();

    // Cleanup expired keys periodically to prevent memory leaks
    setInterval(() => {
        const now = Date.now();
        for (const [ip, data] of ipRequestStore.entries()) {
            if (now - data.resetTime > windowMs) {
                ipRequestStore.delete(ip);
            }
        }
    }, windowMs * 2);

    return (req, res, next) => {
        // Handle behind proxies or direct connections
        const ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress;
        const now = Date.now();

        if (!ipRequestStore.has(ip)) {
            ipRequestStore.set(ip, {
                count: 1,
                resetTime: now + windowMs
            });
            return next();
        }

        const data = ipRequestStore.get(ip);

        if (now > data.resetTime) {
            // Window expired, reset
            data.count = 1;
            data.resetTime = now + windowMs;
            return next();
        }

        data.count++;
        if (data.count > maxLimit) {
            return res.status(429).json({
                success: false,
                message,
                code: 'TOO_MANY_REQUESTS'
            });
        }

        next();
    };
};

module.exports = rateLimit;
