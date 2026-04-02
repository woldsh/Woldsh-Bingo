const { validateInitData, getUserFromInitData } = require('../utils/telegram');
const prisma = require('../lib/prisma');

/**
 * Middleware to authenticate Telegram WebApp requests.
 * Expects initData in Authorization header or query param.
 */
async function authMiddleware(req, res, next) {
    try {
        const initData = req.headers['x-telegram-init-data'] || req.query.initData;

        console.log('[Auth] initData present:', !!initData, initData ? `(length: ${initData.length})` : '');

        if (!initData) {
            // Development fallback to allow browser testing
            if (process.env.NODE_ENV !== 'production') {
                const devUser = await prisma.user.findFirst({
                    where: { username: 'sonempireg' } // Use your username for dev
                });
                if (devUser) {
                    console.log('[Auth] DEV FALLBACK → sonempireg');
                    req.user = {
                        ...devUser,
                        telegramId: Number(devUser.telegramId),
                        balance: Number(devUser.balance),
                    };
                    return next();
                }
            }
            return res.status(401).json({ error: 'Authentication required' });
        }

        const botToken = process.env.BOT_TOKEN;
        const validatedData = validateInitData(initData, botToken);

        console.log('[Auth] Validation result:', validatedData ? 'SUCCESS' : 'FAILED');

        if (!validatedData) {
            // If validation fails in dev, still try to extract user from initData for debugging
            console.log('[Auth] initData validation FAILED. Raw initData:', initData.substring(0, 200));
            return res.status(401).json({ error: 'Invalid authentication data' });
        }

        const userInfo = getUserFromInitData(validatedData);
        console.log('[Auth] User from initData:', userInfo);

        if (!userInfo) {
            return res.status(401).json({ error: 'User data not found' });
        }

        // Find or create user in database
        let user = await prisma.user.findUnique({
            where: { telegramId: BigInt(userInfo.telegramId) }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    telegramId: BigInt(userInfo.telegramId),
                    username: userInfo.username,
                    firstName: userInfo.firstName,
                    lastName: userInfo.lastName,
                }
            });
            console.log('[Auth] Created new user:', user.id, userInfo.username);
        } else {
            console.log('[Auth] Found existing user:', user.id, user.username);
        }

        // Attach user to request
        req.user = {
            ...user,
            telegramId: Number(user.telegramId),
            balance: Number(user.balance),
        };
        req.telegramData = validatedData;

        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({ error: 'Authentication failed' });
    }
}

/**
 * Optional auth - doesn't fail if no auth provided, useful for public endpoints
 */
async function optionalAuth(req, res, next) {
    try {
        const initData = req.headers['x-telegram-init-data'] || req.query.initData;
        if (initData) {
            return authMiddleware(req, res, next);
        }
        next();
    } catch {
        next();
    }
}

module.exports = { authMiddleware, optionalAuth };
