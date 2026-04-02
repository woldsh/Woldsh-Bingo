const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_admin_secret_key_123';

/**
 * Middleware to authenticate requests to /admin endpoints
 * Expects Bearer token in Authorization header
 */
async function adminAuthMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Admin authentication required' });
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token missing' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded || !decoded.id) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const admin = await prisma.admin.findUnique({
            where: { id: decoded.id }
        });

        if (!admin) {
            return res.status(401).json({ error: 'Admin user not found' });
        }

        req.admin = admin;
        next();
    } catch (error) {
        console.error('Admin Auth middleware error:', error);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired' });
        }
        return res.status(401).json({ error: 'Authentication failed' });
    }
}

/**
 * Middleware to ensure the admin has 'super_admin' role
 */
function requireSuperAdmin(req, res, next) {
    if (!req.admin || req.admin.role !== 'super_admin') {
        return res.status(403).json({ error: 'Only Super Admin can perform this action' });
    }
    next();
}

module.exports = { adminAuthMiddleware, requireSuperAdmin, JWT_SECRET };
