const express = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me - Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch user again to get most up-to-date balance and stats
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const [gamesPlayed, gamesWon, winningsResult] = await Promise.all([
            prisma.gamePlayer.count({ where: { userId } }),
            prisma.gamePlayer.count({ where: { userId, isWinner: true } }),
            prisma.transaction.aggregate({
                where: { userId, type: 'win', status: 'completed' },
                _sum: { amount: true }
            })
        ]);

        const totalWinnings = Number(winningsResult?._sum?.amount || 0);

        res.json({
            user: {
                id: user.id,
                telegramId: user.telegramId ? user.telegramId.toString() : null, // Convert BigInt to String for safety
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone,
                balance: Number(user.balance || 0),
                playBalance: Number(user.giftBalance || 0), // Use giftBalance as playBalance
                status: user.status,
                createdAt: user.createdAt,
            },
            stats: {
                gamesPlayed,
                gamesWon,
                totalWinnings,
                winRate: gamesPlayed > 0 ? ((gamesWon / gamesPlayed) * 100).toFixed(1) : '0.0',
            }
        });
    } catch (error) {
        console.error('[UserAPI] Error getting profile:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

/**
 * GET /api/users/history - Get game history
 */
router.get('/history', authMiddleware, async (req, res) => {
    try {
        const gamePlayers = await prisma.gamePlayer.findMany({
            where: { userId: req.user.id },
            include: {
                game: {
                    select: {
                        id: true,
                        stake: true,
                        roomName: true,
                        status: true,
                        prize: true,
                        createdAt: true,
                    }
                }
            },
            orderBy: { joinedAt: 'desc' },
            take: 5,
        });

        res.json({
            history: gamePlayers.map(gp => ({
                gameId: gp.game.id,
                roomName: gp.game.roomName,
                stake: gp.game.stake,
                status: gp.game.status,
                isWinner: gp.isWinner,
                prize: gp.isWinner ? Number(gp.game.prize) : 0,
                playedAt: gp.joinedAt,
            }))
        });
    } catch (error) {
        console.error('Error getting history:', error);
        res.status(500).json({ error: 'Failed to get history' });
    }
});

/**
 * INTERNAL endpoints for Bot (Secured by secret)
 */
const INTERNAL_SECRET = process.env.INTERNAL_SECRET || 'bingoson-secret-123';

router.get('/internal/:telegramId', async (req, res) => {
    const { secret } = req.query;
    if (secret !== INTERNAL_SECRET) return res.status(403).json({ error: 'Forbidden' });

    try {
        const user = await prisma.user.findUnique({
            where: { telegramId: BigInt(req.params.telegramId) }
        });
        
        let stats = { gamesPlayed: 0, gamesWon: 0 };
        if (user) {
            const [gamesPlayed, gamesWon] = await Promise.all([
                prisma.gamePlayer.count({ where: { userId: user.id } }),
                prisma.gamePlayer.count({ where: { userId: user.id, isWinner: true } })
            ]);
            stats = { gamesPlayed, gamesWon };
        }
        
        res.json({ 
            user: user ? { ...user, telegramId: Number(user.telegramId) } : null,
            stats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/internal/phone', async (req, res) => {
    const { secret, telegramId, phone, firstName, lastName, username } = req.body;
    if (secret !== INTERNAL_SECRET) return res.status(403).json({ error: 'Forbidden' });

    try {
        let user = await prisma.user.findUnique({
            where: { telegramId: BigInt(telegramId) }
        });

        if (user) {
            if (!user.phone) {
                // Register phone and give 10 ETB bonus
                await prisma.user.update({
                    where: { id: user.id },
                    data: { phone, balance: { increment: 10 } }
                });
            }
        } else {
            // Create new user with phone and 10 ETB bonus
            await prisma.user.create({
                data: {
                    telegramId: BigInt(telegramId),
                    username,
                    firstName,
                    lastName,
                    phone,
                    balance: 10
                }
            });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
