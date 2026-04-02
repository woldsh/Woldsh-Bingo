const express = require('express');
const jwt = require('jsonwebtoken');
const { adminAuthMiddleware, requireSuperAdmin, JWT_SECRET } = require('../middleware/adminAuth');
const Redis = require('ioredis');
const prisma = require('../lib/prisma');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Optional: Redis client for settings cache
const redisClient = process.env.REDIS_URL ? new Redis(process.env.REDIS_URL) : null;

// Add global BigInt serialization support for JSON
BigInt.prototype.toJSON = function () {
    return this.toString();
};

// Admin Login - Generate JWT
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const admin = await prisma.admin.findUnique({ where: { username } });
        if (!admin || admin.password !== password) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign({ id: admin.id, role: admin.role, username: admin.username }, JWT_SECRET, { expiresIn: '12h' });

        res.json({
            success: true,
            token,
            admin: {
                id: admin.id,
                username: admin.username,
                role: admin.role,
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Get Dashboard Stats
router.get('/dashboard', adminAuthMiddleware, async (req, res) => {
    try {
        const [
            totalPlayers,
            playersToday,
            activeGames,
            totalGames,
            pendingDeposits,
            pendingWithdrawals,
            totalDeposited,
            totalWithdrawn,
            transactions,
            bannedPlayers,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.user.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0))
                    }
                }
            }),
            prisma.game.count({
                where: { status: { in: ['waiting', 'playing'] } }
            }),
            prisma.game.count(),
            prisma.transaction.count({
                where: { type: 'deposit', status: 'pending' }
            }),
            prisma.transaction.count({
                where: { type: 'withdraw', status: 'pending' }
            }),
            prisma.transaction.aggregate({
                where: {
                    type: { in: ['deposit', 'adjust_wallet'] },
                    status: 'completed',
                    amount: { gt: 0 }
                },
                _sum: { amount: true },
                _count: true
            }),
            prisma.transaction.aggregate({
                where: {
                    OR: [
                        { type: 'withdraw', status: 'completed' },
                        { type: 'adjust_wallet', status: 'completed', amount: { lt: 0 } }
                    ]
                },
                _sum: { amount: true },
                _count: true
            }),
            prisma.transaction.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
                include: { user: { select: { username: true, firstName: true } } }
            }),
            prisma.user.count({ where: { status: 'banned' } }),
        ]);

        res.json({
            stats: {
                totalPlayers,
                playersToday,
                activeGames,
                totalGames,
                pendingDeposits,
                pendingWithdrawals,
                totalDeposited: totalDeposited?._sum?.amount || 0,
                approvedDepositsCount: totalDeposited?._count || 0,
                totalWithdrawn: totalWithdrawn?._sum?.amount || 0,
                approvedWithdrawalsCount: totalWithdrawn?._count || 0,
                bannedPlayers,
            },
            recentTransactions: transactions.map(tx => ({
                id: tx.id,
                type: tx.type,
                player: tx.user ? (tx.user.username || tx.user.firstName || `User_${tx.userId}`) : `User_${tx.userId}`,
                amount: tx.amount,
                status: tx.status,
                note: tx.note,
                createdAt: tx.createdAt
            }))
        });
    } catch (error) {
        console.error('Error fetching admin dashboard:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard data' });
    }
});

// Get all players
router.get('/players', adminAuthMiddleware, async (req, res) => {
    try {
        const players = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { gamePlayers: true }
                },
                gamePlayers: {
                    where: { isWinner: true },
                    select: { id: true }
                }
            }
        });

        const playersWithExtra = await Promise.all(players.map(async (p) => {
            const lastStake = await prisma.transaction.findFirst({
                where: {
                    userId: p.id,
                    type: { in: ['bet', 'stake', 'bet_placed'] }
                },
                orderBy: { createdAt: 'desc' }
            });

            return {
                ...p,
                winCount: p.gamePlayers.length,
                lastStakeAmount: lastStake ? lastStake.amount : 0,
                telegramId: p.telegramId ? p.telegramId.toString() : null
            };
        }));

        res.json(playersWithExtra);
    } catch (error) {
        console.error('Error fetching admin players:', error);
        res.status(500).json({ error: 'Failed to fetch players' });
    }
});

// Update player (Super Admin only)
router.put('/players/:id', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { balance, giftBalance, status, phone, username, firstName, lastName } = req.body;

        const data = {};
        if (balance !== undefined) data.balance = parseFloat(balance);
        if (giftBalance !== undefined) data.giftBalance = parseFloat(giftBalance);
        if (status !== undefined) data.status = status;
        if (phone !== undefined) data.phone = phone;
        if (username !== undefined) data.username = username;
        if (firstName !== undefined) data.firstName = firstName;
        if (lastName !== undefined) data.lastName = lastName;

        const player = await prisma.user.update({
            where: { id: parseInt(id) },
            data
        });

        res.json({
            success: true,
            player
        });
    } catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({ error: 'Failed to update player' });
    }
});

// Delete player (Super Admin only)
router.delete('/players/:id', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const playerId = parseInt(id);

        // Delete all related records first, then the user, in a transaction
        await prisma.$transaction([
            prisma.transaction.deleteMany({ where: { userId: playerId } }),
            prisma.gamePlayer.deleteMany({ where: { userId: playerId } }),
            prisma.user.delete({ where: { id: playerId } }),
        ]);

        res.json({ success: true, message: 'Player and all related records deleted successfully' });
    } catch (error) {
        console.error('Error deleting player:', error);
        res.status(500).json({
            error: 'Failed to delete player. Please try again.'
        });
    }
});

// Ban/Unban player toggle
router.post('/players/:id/ban', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const player = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        const newStatus = player.status === 'banned' ? 'active' : 'banned';
        const updated = await prisma.user.update({
            where: { id: parseInt(id) },
            data: { status: newStatus }
        });

        res.json({
            success: true,
            status: newStatus,
            message: `Player ${newStatus === 'banned' ? 'banned' : 'unbanned'} successfully`
        });
    } catch (error) {
        console.error('Error toggling ban:', error);
        res.status(500).json({ error: 'Failed to update player status' });
    }
});

// Adjust Wallet Balance Manually
router.post('/players/:id/adjust-wallet', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, note } = req.body;
        const adminId = req.admin.id;

        const adjAmount = parseFloat(amount);
        if (isNaN(adjAmount) || adjAmount === 0) {
            return res.status(400).json({ error: 'Valid non-zero amount required' });
        }

        const player = await prisma.user.findUnique({ where: { id: parseInt(id) } });
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }

        // Prevent negative balance
        if (adjAmount < 0 && player.balance.toNumber() + adjAmount < 0) {
            return res.status(400).json({ error: 'Insufficient funds for this debit' });
        }

        const adminUser = await prisma.admin.findUnique({ where: { id: adminId } });

        // Update balance and log transaction atomically
        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.user.update({
                where: { id: parseInt(id) },
                data: {
                    balance: { increment: adjAmount }
                }
            });

            const transaction = await tx.transaction.create({
                data: {
                    userId: parseInt(id),
                    type: 'adjust_wallet',
                    amount: adjAmount,
                    status: 'completed',
                    reference: `admin_${adminId}_${Date.now()}`,
                    note: `Admin(${adminUser?.username || 'System'}): ${note || 'Manual adjustment'}`
                }
            });

            // Log admin action
            if (adminId) {
                await tx.auditLog.create({
                    data: {
                        adminId,
                        action: 'ADJUST_WALLET',
                        targetId: id.toString(),
                        targetType: 'user',
                        beforeData: JSON.stringify({ balance: player.balance }),
                        afterData: JSON.stringify({ balance: updated.balance, amount: adjAmount }),
                        reason: note
                    }
                });
            }

            return { updated, transaction };
        });

        res.json({ success: true, balance: result.updated.balance, message: 'Wallet adjusted successfully' });

    } catch (error) {
        console.error('Error adjusting wallet:', error);
        res.status(500).json({ error: 'Failed to adjust wallet balance' });
    }
});

// Get all games
router.get('/games', adminAuthMiddleware, async (req, res) => {
    try {
        const games = await prisma.game.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { players: true }
                }
            }
        });
        res.json(games);
    } catch (error) {
        console.error('Error fetching admin games:', error);
        res.status(500).json({ error: 'Failed to fetch games' });
    }
});

// Get all transactions
router.get('/transactions', adminAuthMiddleware, async (req, res) => {
    try {
        const { type, status } = req.query;
        let where = {};
        if (type && type !== 'all') where.type = type;
        if (status && status !== 'all') where.status = status;

        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { username: true, firstName: true, telegramId: true } } }
        });

        res.json(transactions.map(tx => ({
            ...tx,
            user: { ...tx.user, telegramId: tx.user?.telegramId?.toString() }
        })));
    } catch (error) {
        console.error('Error fetching admin transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

// =============================================
// Admin User Management
// =============================================

// Get all admins
router.get('/admins', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const admins = await prisma.admin.findMany({
            orderBy: { createdAt: 'desc' },
            select: { id: true, username: true, role: true, createdAt: true }
        });
        res.json(admins);
    } catch (error) {
        console.error('Error fetching admins:', error);
        res.status(500).json({ error: 'Failed to fetch admins' });
    }
});

// Create new admin
router.post('/admins', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const existing = await prisma.admin.findUnique({ where: { username } });
        if (existing) {
            return res.status(409).json({ error: 'Username already exists' });
        }
        const admin = await prisma.admin.create({
            data: {
                username,
                password,
                role: role || 'admin'
            },
            select: { id: true, username: true, role: true, createdAt: true }
        });
        res.json({ success: true, admin });
    } catch (error) {
        console.error('Error creating admin:', error);
        res.status(500).json({ error: 'Failed to create admin' });
    }
});

// Update admin (change role or password)
router.put('/admins/:id', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { password, role } = req.body;
        const data = {};
        if (password) data.password = password;
        if (role) data.role = role;

        const admin = await prisma.admin.update({
            where: { id: parseInt(id) },
            data,
            select: { id: true, username: true, role: true, createdAt: true }
        });
        res.json({ success: true, admin });
    } catch (error) {
        console.error('Error updating admin:', error);
        res.status(500).json({ error: 'Failed to update admin' });
    }
});

// Delete admin
router.delete('/admins/:id', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.admin.delete({ where: { id: parseInt(id) } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting admin:', error);
        res.status(500).json({ error: 'Failed to delete admin' });
    }
});

// =============================================
// Platform Settings (Database-backed via Setting model)
// =============================================

const DEFAULT_SETTINGS = {
    maintenanceMode: 'false',
    minWithdrawal: '100',
    maxWithdrawal: '10000',
    minDeposit: '10',
    referralBonus: '50',
    welcomeBonus: '10',
    houseFeePercent: '20',
    numberCallInterval: '3',
    minPlayersToStart: '2',
    waitingTimeSeconds: '30',
    maxCardsPerPlayer: '2',
    botAnnouncements: '',
    supportContact: '@woldsh_support',
    platformName: 'Woldsh Bingo',
    currency: 'ETB',
};

// Seed default settings into DB if they don't exist
async function seedDefaultSettings() {
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        await prisma.setting.upsert({
            where: { key },
            update: {},  // Don't overwrite existing values
            create: { key, value, description: key.replace(/([A-Z])/g, ' $1').trim() }
        });
    }
}

// Get current settings
router.get('/settings', adminAuthMiddleware, async (req, res) => {
    try {
        // Ensure defaults exist
        await seedDefaultSettings();

        const dbSettings = await prisma.setting.findMany();
        
        // Convert array of {key, value} to flat object
        const settings = {};
        for (const s of dbSettings) {
            settings[s.key] = s.value;
        }

        res.json(settings);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

// Update settings
router.post('/settings', adminAuthMiddleware, async (req, res) => {
    try {
        const updates = req.body;
        const adminId = req.admin?.id;

        // Upsert each setting key-value pair into the database
        for (const [key, value] of Object.entries(updates)) {
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                await prisma.setting.upsert({
                    where: { key },
                    update: { value: String(value) },
                    create: { key, value: String(value), description: key.replace(/([A-Z])/g, ' $1').trim() }
                });
            }
        }

        // Log the settings change
        if (adminId) {
            await prisma.auditLog.create({
                data: {
                    adminId,
                    action: 'UPDATE_SETTINGS',
                    targetType: 'settings',
                    targetId: Object.keys(updates).join(','),
                    afterData: JSON.stringify(updates),
                    reason: 'Admin updated global settings'
                }
            });
        }

        // Fetch all settings fresh from DB to return
        const dbSettings = await prisma.setting.findMany();
        const settings = {};
        for (const s of dbSettings) {
            settings[s.key] = s.value;
        }

        res.json({ success: true, settings });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// =============================================
// Revenue & Reports
// =============================================

// Get Revenue Report
router.get('/reports/revenue', adminAuthMiddleware, async (req, res) => {
    try {
        const stats = await prisma.transaction.groupBy({
            by: ['type'],
            _sum: {
                amount: true,
            },
            where: {
                status: 'completed'
            }
        });

        // Format to a friendly object
        const revenue = stats.reduce((acc, curr) => {
            acc[curr.type] = Number(curr._sum.amount) || 0;
            return acc;
        }, {});

        res.json({ success: true, revenue });
    } catch (error) {
        console.error('Error generating revenue report:', error);
        res.status(500).json({ error: 'Failed to generate revenue report' });
    }
});

// =============================================
// Manual Wallet Adjustments & Audit
// =============================================

// Credit Wallet
router.post('/wallets/:userId/credit', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const adminId = req.admin.id;
        const { amount, reason } = req.body;

        if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });
        if (!reason) return res.status(400).json({ error: 'Reason for adjustment is required' });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const beforeBalance = user.balance;

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { balance: { increment: amount } }
            }),
            prisma.transaction.create({
                data: {
                    userId,
                    type: 'adjust_wallet',
                    amount: amount,
                    status: 'completed',
                    note: `Admin Credit: ${reason}`,
                }
            }),
            prisma.auditLog.create({
                data: {
                    adminId,
                    action: 'wallet_credit',
                    targetType: 'user',
                    targetId: String(userId),
                    beforeData: JSON.stringify({ balance: beforeBalance }),
                    afterData: JSON.stringify({ balance: Number(beforeBalance) + amount }),
                    reason
                }
            })
        ]);

        res.json({ success: true, message: `Successfully credited ${amount} to user ${userId}` });
    } catch (error) {
        console.error('Error crediting wallet:', error);
        res.status(500).json({ error: 'Failed to credit wallet' });
    }
});

// Debit Wallet
router.post('/wallets/:userId/debit', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const adminId = req.admin.id;
        const { amount, reason } = req.body;

        if (!amount || amount <= 0) return res.status(400).json({ error: 'Valid amount required' });
        if (!reason) return res.status(400).json({ error: 'Reason for adjustment is required' });

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return res.status(404).json({ error: 'User not found' });

        const beforeBalance = user.balance;

        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { balance: { decrement: amount } }
            }),
            prisma.transaction.create({
                data: {
                    userId,
                    type: 'adjust_wallet',
                    amount: -Math.abs(amount), // Negative to show deduction
                    status: 'completed',
                    note: `Admin Debit: ${reason}`,
                }
            }),
            prisma.auditLog.create({
                data: {
                    adminId,
                    action: 'wallet_debit',
                    targetType: 'user',
                    targetId: String(userId),
                    beforeData: JSON.stringify({ balance: beforeBalance }),
                    afterData: JSON.stringify({ balance: Number(beforeBalance) - amount }),
                    reason
                }
            })
        ]);

        res.json({ success: true, message: `Successfully debited ${amount} from user ${userId}` });
    } catch (error) {
        console.error('Error debiting wallet:', error);
        res.status(500).json({ error: 'Failed to debit wallet' });
    }
});

// Get Audit Logs
router.get('/audit-logs', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json({ success: true, logs });
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// --- Room Templates (Stakes) Management ---

// Get all room templates
router.get('/room-templates', adminAuthMiddleware, async (req, res) => {
    try {
        const templates = await prisma.roomTemplate.findMany({
            orderBy: { stake: 'asc' }
        });

        const enrichedTemplates = await Promise.all(templates.map(async (tmpl) => {
            const game = await prisma.game.findFirst({
                where: { stake: tmpl.stake, status: 'waiting' },
                include: { players: { select: { id: true } } },
                orderBy: { createdAt: 'desc' }
            });

            const livePlayers = game ? game.players.length : 0;
            const livePrize = livePlayers > 0 ? Math.floor(livePlayers * tmpl.stake * 0.8) : 0;

            return {
                ...tmpl,
                livePlayers,
                livePrize
            };
        }));

        res.json(enrichedTemplates);
    } catch (error) {
        console.error('Error fetching room templates:', error);
        res.status(500).json({ error: 'Failed to fetch room templates' });
    }
});

// Create room template
router.post('/room-templates', adminAuthMiddleware, async (req, res) => {
    try {
        const { name, stake, prize, maxPlayers, isActive, isMaintenance, theme, sortOrder } = req.body;

        if (!name || !stake) {
            return res.status(400).json({ error: 'Name and stake are required' });
        }

        const template = await prisma.roomTemplate.create({
            data: {
                name,
                stake: parseInt(stake),
                prize: parseFloat(prize) > 0 ? parseFloat(prize) : (parseInt(stake) * parseInt(maxPlayers || 4) * 0.9),
                maxPlayers: parseInt(maxPlayers || 4),
                theme: theme || 'blue',
                sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : 0,
                isActive: isActive !== undefined ? isActive : true,
                isMaintenance: isMaintenance !== undefined ? isMaintenance : false
            }
        });

        if (req.io) {
            req.io.emit('rooms_updated');
        }

        res.status(201).json(template);
    } catch (error) {
        console.error('Error creating room template:', error);
        res.status(500).json({ error: 'Failed to create room template' });
    }
});

// Update room template
router.put('/room-templates/:id', adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, stake, prize, maxPlayers, isActive, isMaintenance, theme, sortOrder } = req.body;

        const template = await prisma.roomTemplate.update({
            where: { id: parseInt(id) },
            data: {
                name,
                stake: stake !== undefined ? parseInt(stake) : undefined,
                prize: prize !== undefined ? parseFloat(prize) : undefined,
                maxPlayers: maxPlayers !== undefined ? parseInt(maxPlayers) : undefined,
                theme: theme || undefined,
                sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : undefined,
                isActive: isActive !== undefined ? isActive : undefined,
                isMaintenance: isMaintenance !== undefined ? isMaintenance : undefined
            }
        });

        // If deactivated, delete any "waiting" games for this stake
        if (isActive === false) {
            await prisma.game.deleteMany({
                where: {
                    stake: template.stake,
                    status: 'waiting'
                }
            });
        }

        if (req.io) {
            req.io.emit('rooms_updated');
        }

        res.json(template);
    } catch (error) {
        console.error('Error updating room template:', error);
        res.status(500).json({ error: 'Failed to update room template' });
    }
});

// Delete room template
router.delete('/room-templates/:id', adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        // Find it first to get the stake for cleanup
        const template = await prisma.roomTemplate.findUnique({
            where: { id: parseInt(id) }
        });

        if (!template) {
            return res.status(404).json({ error: 'Room template not found' });
        }

        // Find all waiting games for this stake
        const waitingGames = await prisma.game.findMany({
            where: {
                stake: template.stake,
                status: 'waiting'
            },
            select: { id: true }
        });

        const waitingGameIds = waitingGames.map(g => g.id);

        // Use a transaction to cascade-delete related records properly
        await prisma.$transaction(async (tx) => {
            if (waitingGameIds.length > 0) {
                // 1. Delete claims referencing these games
                await tx.claim.deleteMany({
                    where: { gameId: { in: waitingGameIds } }
                });
                // 2. Delete game players referencing these games
                await tx.gamePlayer.deleteMany({
                    where: { gameId: { in: waitingGameIds } }
                });
                // 3. Delete the waiting games
                await tx.game.deleteMany({
                    where: { id: { in: waitingGameIds } }
                });
            }
            // 4. Delete the template itself
            await tx.roomTemplate.delete({
                where: { id: parseInt(id) }
            });
        });

        if (req.io) {
            req.io.emit('rooms_updated');
        }

        res.json({ success: true, message: `Room template "${template.name}" deleted successfully` });
    } catch (error) {
        console.error('Error deleting room template:', error);
        res.status(500).json({ error: 'Failed to delete room template' });
    }
});

// Toggle maintenance on a room template
router.put('/room-templates/:id/maintenance', adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const template = await prisma.roomTemplate.findUnique({ where: { id: parseInt(id) } });
        if (!template) return res.status(404).json({ error: 'Room template not found' });

        const updated = await prisma.roomTemplate.update({
            where: { id: parseInt(id) },
            data: { isMaintenance: !template.isMaintenance }
        });

        if (req.io) {
            req.io.emit('rooms_updated');
        }

        res.json({
            success: true,
            isMaintenance: updated.isMaintenance,
            message: `Room "${updated.name}" is now ${updated.isMaintenance ? 'in maintenance' : 'back online'}`
        });
    } catch (error) {
        console.error('Error toggling maintenance:', error);
        res.status(500).json({ error: 'Failed to toggle maintenance' });
    }
});

// ==========================================
// Phase 1: Core Operations - Games/Rooms
// ==========================================

// Get all games (rooms/rounds)
router.get('/games', adminAuthMiddleware, async (req, res) => {
    try {
        const { status } = req.query;
        let where = {};
        if (status && status !== 'all') {
            where.status = status;
        }

        const games = await prisma.game.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { players: true }
                },
                players: {
                    select: { id: true, userId: true, isWinner: true, cardCount: true }
                }
            }
        });

        // Calculate actual cards sold
        const enhancedGames = games.map(game => {
            let cardsSold = 0;
            game.players.forEach(p => {
                cardsSold += p.cardCount;
            });
            return {
                ...game,
                cardsSold,
                playerCount: game._count.players
            };
        });

        res.json(enhancedGames);
    } catch (error) {
        console.error('Error fetching admin games:', error);
        res.status(500).json({ error: 'Failed to fetch games' });
    }
});

// Cancel a waiting room
router.post('/games/:id/cancel', adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const game = await prisma.game.findUnique({
            where: { id: parseInt(id) },
            include: { players: true }
        });

        if (!game) return res.status(404).json({ error: 'Game not found' });
        if (game.status !== 'waiting') return res.status(400).json({ error: 'Only waiting games can be cancelled' });

        // IMPORTANT: In a real production system, you need to iterate over players
        // and refund them here (credit their wallet, log audit, create transaction).
        // For MVP, we simply update the status and emit event.

        const updatedGame = await prisma.game.update({
            where: { id: parseInt(id) },
            data: { status: 'cancelled' }
        });

        if (req.io) {
            req.io.to(`game_${id}`).emit('game_cancelled');
            req.io.emit('rooms_updated');
        }

        res.json({ success: true, game: updatedGame });
    } catch (error) {
        console.error('Error cancelling game:', error);
        res.status(500).json({ error: 'Failed to cancel game' });
    }
});

// ==========================================
// Phase 1: Deposits & Withdrawals
// ==========================================

// Get Deposits
router.get('/deposits', adminAuthMiddleware, async (req, res) => {
    try {
        const { status } = req.query;
        let where = { type: 'deposit' };
        if (status && status !== 'all') {
            where.status = status;
        }

        const deposits = await prisma.transaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { username: true, firstName: true, telegramId: true } }
            }
        });

        res.json(deposits.map(d => ({
            ...d,
            user: { ...d.user, telegramId: d.user.telegramId?.toString() }
        })));
    } catch (error) {
        console.error('Error fetching deposits:', error);
        res.status(500).json({ error: 'Failed to fetch deposits' });
    }
});

// Approve Deposit
router.post('/deposits/:id/approve', adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await prisma.$transaction(async (tx) => {
            const deposit = await tx.transaction.findUnique({ where: { id: parseInt(id) } });

            if (!deposit) throw new Error('Deposit not found');
            if (deposit.status !== 'pending') throw new Error('Deposit is not pending');

            // 1. Update deposit status
            const updated = await tx.transaction.update({
                where: { id: deposit.id },
                data: { status: 'completed' }
            });

            // 2. Credit user wallet
            await tx.user.update({
                where: { id: deposit.userId },
                data: { balance: { increment: deposit.amount } }
            });

            // 3. Optional Audit Log
            await tx.auditLog.create({
                data: {
                    adminId: req.admin.id,
                    action: 'approve_deposit',
                    targetType: 'transaction',
                    targetId: deposit.id.toString(),
                    reason: 'Admin manual approval',
                    afterData: JSON.stringify({ amount: deposit.amount })
                }
            });

            return updated;
        });

        res.json({ success: true, transaction: result });
    } catch (error) {
        console.error('Error approving deposit:', error);
        res.status(400).json({ error: error.message || 'Failed to approve deposit' });
    }
});

// Reject Deposit
router.post('/deposits/:id/reject', adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const deposit = await prisma.transaction.findUnique({ where: { id: parseInt(id) } });

        if (!deposit || deposit.status !== 'pending') {
            return res.status(400).json({ error: 'Deposit not found or not pending' });
        }

        const updated = await prisma.transaction.update({
            where: { id: parseInt(id) },
            data: { status: 'failed', note: 'Rejected by admin' }
        });

        res.json({ success: true, transaction: updated });
    } catch (error) {
        console.error('Error rejecting deposit:', error);
        res.status(500).json({ error: 'Failed to reject deposit' });
    }
});

// Get Withdrawals
router.get('/withdrawals', adminAuthMiddleware, async (req, res) => {
    try {
        const { status } = req.query;
        let where = { type: 'withdraw' };
        if (status && status !== 'all') {
            where.status = status;
        }

        const withdrawals = await prisma.transaction.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { username: true, firstName: true, telegramId: true } }
            }
        });

        res.json(withdrawals.map(w => ({
            ...w,
            user: { ...w.user, telegramId: w.user.telegramId?.toString() }
        })));
    } catch (error) {
        console.error('Error fetching withdrawals:', error);
        res.status(500).json({ error: 'Failed to fetch withdrawals' });
    }
});

// Reject Withdrawal
router.post('/withdrawals/:id/reject', adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const result = await prisma.$transaction(async (tx) => {
            const withdrawal = await tx.transaction.findUnique({ where: { id: parseInt(id) } });
            if (!withdrawal || withdrawal.status !== 'pending') throw new Error('Withdrawal not found or not pending');

            // 1. Update status
            const updated = await tx.transaction.update({
                where: { id: withdrawal.id },
                data: { status: 'failed', note: 'Rejected by admin - funds returned to balance' }
            });

            // 2. Return funds to user (locked balance -> main balance logic depending on your schema)
            // Assuming we just increment the main balance back since it was deducted on request
            await tx.user.update({
                where: { id: withdrawal.userId },
                data: { balance: { increment: withdrawal.amount } }
            });

            return updated;
        });

        res.json({ success: true, transaction: result });
    } catch (error) {
        console.error('Error rejecting withdrawal:', error);
        res.status(400).json({ error: error.message || 'Failed to reject withdrawal' });
    }
});

// Approve Withdrawal (Mark as processing/approved, but wait for manual physical transfer)
router.post('/withdrawals/:id/approve', adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const withdrawal = await prisma.transaction.findUnique({ where: { id: parseInt(id) } });

        if (!withdrawal || withdrawal.status !== 'pending') {
            return res.status(400).json({ error: 'Withdrawal not found or not pending' });
        }

        const updated = await prisma.transaction.update({
            where: { id: parseInt(id) },
            data: { status: 'approved', note: 'Approved by admin, pending checkout' }
        });

        res.json({ success: true, transaction: updated });
    } catch (error) {
        console.error('Error approving withdrawal:', error);
        res.status(500).json({ error: 'Failed to approve withdrawal' });
    }
});

// Mark Withdrawal Paid (After physical transfer)
router.post('/withdrawals/:id/mark-paid', adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const withdrawal = await prisma.transaction.findUnique({ where: { id: parseInt(id) } });

        if (!withdrawal || (withdrawal.status !== 'pending' && withdrawal.status !== 'approved')) {
            return res.status(400).json({ error: 'Withdrawal not in valid state to be marked paid' });
        }

        const updated = await prisma.transaction.update({
            where: { id: parseInt(id) },
            data: { status: 'completed', note: 'Paid out by admin' }
        });

        res.json({ success: true, transaction: updated });
    } catch (error) {
        console.error('Error marking withdrawal paid:', error);
        res.status(500).json({ error: 'Failed to mark as paid' });
    }
});

// ==========================================
// Phase 1: Win Patterns
// ==========================================

// Get all win patterns
router.get('/win-patterns', adminAuthMiddleware, async (req, res) => {
    try {
        const patterns = await prisma.winPattern.findMany({
            orderBy: { priority: 'desc' }
        });
        res.json(patterns);
    } catch (error) {
        console.error('Error fetching win patterns:', error);
        res.status(500).json({ error: 'Failed to fetch win patterns' });
    }
});

// Create win pattern
router.post('/win-patterns', adminAuthMiddleware, async (req, res) => {
    try {
        const { name, code, cells, isActive, priority } = req.body;

        // Basic validation
        if (!name || !code || !cells || !Array.isArray(cells)) {
            return res.status(400).json({ error: 'Invalid pattern data. name, code, and cells array required.' });
        }

        const pattern = await prisma.winPattern.create({
            data: {
                name,
                code,
                cells,
                isActive: isActive ?? true,
                priority: priority ?? 0
            }
        });

        // Add audit log
        await prisma.auditLog.create({
            data: {
                adminId: req.admin.id,
                action: 'CREATE_WIN_PATTERN',
                targetType: 'winPattern',
                targetId: pattern.id.toString(),
                reason: 'New win pattern created',
                afterData: JSON.stringify(pattern)
            }
        });

        res.json({ success: true, pattern });
    } catch (error) {
        // Handle unique constraint failure for 'code'
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'A pattern with this code already exists.' });
        }
        console.error('Error creating win pattern:', error);
        res.status(500).json({ error: 'Failed to create win pattern' });
    }
});

// Update win pattern
router.put('/win-patterns/:id', adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, code, cells, isActive, priority } = req.body;

        const data = {};
        if (name !== undefined) data.name = name;
        if (code !== undefined) data.code = code;
        if (cells !== undefined) data.cells = cells;
        if (isActive !== undefined) data.isActive = isActive;
        if (priority !== undefined) data.priority = priority;

        const oldPattern = await prisma.winPattern.findUnique({ where: { id: parseInt(id) } });

        const pattern = await prisma.winPattern.update({
            where: { id: parseInt(id) },
            data
        });

        // Add audit log
        await prisma.auditLog.create({
            data: {
                adminId: req.admin.id,
                action: 'UPDATE_WIN_PATTERN',
                targetType: 'winPattern',
                targetId: id.toString(),
                reason: 'Win pattern updated',
                beforeData: JSON.stringify(oldPattern),
                afterData: JSON.stringify(pattern)
            }
        });

        res.json({ success: true, pattern });
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ error: 'A pattern with this code already exists.' });
        }
        console.error('Error updating win pattern:', error);
        res.status(500).json({ error: 'Failed to update win pattern' });
    }
});

// Delete win pattern
router.delete('/win-patterns/:id', adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const deletedPattern = await prisma.winPattern.delete({
            where: { id: parseInt(id) }
        });

        // Add audit log
        await prisma.auditLog.create({
            data: {
                adminId: req.admin.id,
                action: 'DELETE_WIN_PATTERN',
                targetType: 'winPattern',
                targetId: id.toString(),
                reason: 'Win pattern deleted',
                beforeData: JSON.stringify(deletedPattern)
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting win pattern:', error);
        res.status(500).json({ error: 'Failed to delete win pattern' });
    }
});

// ==========================================
// Phase 2: Claims Queue
// ==========================================

// Get all claims
router.get('/claims', adminAuthMiddleware, async (req, res) => {
    try {
        const { status } = req.query;
        let where = {};
        if (status && status !== 'all') where.status = status;

        const claims = await prisma.claim.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                user: { select: { username: true, firstName: true } },
                game: { select: { roomName: true, stake: true, prize: true } },
                player: { select: { card: true, card2: true } }
            }
        });

        res.json(claims);
    } catch (error) {
        console.error('Error fetching admin claims:', error);
        res.status(500).json({ error: 'Failed to fetch claims' });
    }
});

// Approve claim
router.post('/claims/:id/approve', adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const claim = await prisma.claim.findUnique({
            where: { id: parseInt(id) },
            include: { game: true }
        });

        if (!claim) return res.status(404).json({ error: 'Claim not found' });
        if (claim.status !== 'pending') return res.status(400).json({ error: 'Claim already processed' });

        // Atomic approval: Update claim, user balance, wallet transaction, and end game
        const result = await prisma.$transaction(async (tx) => {
            // Update claim status
            const updatedClaim = await tx.claim.update({
                where: { id: parseInt(id) },
                data: { status: 'approved', resolvedAt: new Date(), resolvedBy: req.admin.id }
            });

            // Credit winner
            const prizeAmount = parseFloat(claim.game.prize);
            await tx.user.update({
                where: { id: claim.userId },
                data: { balance: { increment: prizeAmount } }
            });

            // Record transaction
            await tx.transaction.create({
                data: {
                    userId: claim.userId,
                    type: 'win',
                    amount: prizeAmount,
                    status: 'completed',
                    method: 'internal',
                    reference: `game_${claim.gameId}_win`,
                    note: `Won game #${claim.gameId}`
                }
            });

            // Set game as finished and assign winner
            const updatedGame = await tx.game.update({
                where: { id: claim.gameId },
                data: {
                    status: 'finished',
                    winnerId: claim.userId
                }
            });

            // Mark gamePlayer as winner
            await tx.gamePlayer.update({
                where: { id: claim.playerId },
                data: { isWinner: true }
            });

            // Add audit log
            await tx.auditLog.create({
                data: {
                    adminId: req.admin.id,
                    action: 'APPROVE_CLAIM',
                    targetType: 'claim',
                    targetId: id.toString(),
                    reason: 'Claim approved by admin'
                }
            });

            return { claim: updatedClaim, game: updatedGame };
        });

        // Emit socket events
        const io = req.app.get('io');
        if (io) {
            io.to(`game_${claim.gameId}`).emit('game_ended', {
                winnerId: claim.userId,
                message: 'We have a winner! This game has ended.'
            });
            io.of('/admin').emit('rooms_updated');
        }

        res.json({ success: true, message: 'Claim approved and player rewarded' });
    } catch (error) {
        console.error('Error approving claim:', error);
        res.status(500).json({ error: 'Failed to approve claim' });
    }
});

// Reject claim
router.post('/claims/:id/reject', adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const claim = await prisma.claim.findUnique({ where: { id: parseInt(id) } });

        if (!claim) return res.status(404).json({ error: 'Claim not found' });
        if (claim.status !== 'pending') return res.status(400).json({ error: 'Claim already processed' });

        await prisma.claim.update({
            where: { id: parseInt(id) },
            data: { status: 'rejected', resolvedAt: new Date(), resolvedBy: req.admin.id }
        });

        // Add audit log
        await prisma.auditLog.create({
            data: {
                adminId: req.admin.id,
                action: 'REJECT_CLAIM',
                targetType: 'claim',
                targetId: id.toString(),
                reason: 'Claim rejected by admin'
            }
        });

        res.json({ success: true, message: 'Claim rejected' });
    } catch (error) {
        console.error('Error rejecting claim:', error);
        res.status(500).json({ error: 'Failed to reject claim' });
    }
});

// ==========================================
// Phase 2: Winners History
// ==========================================

// Get all past winners (finished games with a winner)
router.get('/winners', adminAuthMiddleware, async (req, res) => {
    try {
        const { limit = 50, page = 1 } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const games = await prisma.game.findMany({
            where: {
                status: 'finished',
                winnerId: { not: null }
            },
            orderBy: { updatedAt: 'desc' },
            take: parseInt(limit),
            skip,
            include: {
                players: {
                    where: { isWinner: true },
                    include: {
                        user: { select: { id: true, username: true, firstName: true } }
                    }
                }
            }
        });

        // Format for easier frontend consumption
        const winnersList = games.map(game => {
            const winner = game.players[0]?.user;
            return {
                gameId: game.id,
                roomName: game.roomName,
                stake: game.stake,
                prize: game.prize,
                endedAt: game.updatedAt,
                calledNumsCount: game.calledNums?.length || 0,
                winnerId: winner?.id,
                winnerName: winner?.username || winner?.firstName || `User_${winner?.id}`
            };
        });

        res.json(winnersList);
    } catch (error) {
        console.error('Error fetching admin winners:', error);
        res.status(500).json({ error: 'Failed to fetch winners history' });
    }
});

// ==========================================
// Phase 2: Suspicious Activity
// ==========================================

router.get('/suspicious', adminAuthMiddleware, async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                _count: {
                    select: { gamePlayers: true }
                },
                gamePlayers: {
                    where: { isWinner: true },
                    select: { id: true }
                }
            }
        });

        const suspiciousList = [];

        for (const u of users) {
            const totalGames = u._count.gamePlayers;
            const wins = u.gamePlayers.length;
            const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

            const flags = [];

            // Flag 1: Unusually high win rate (e.g. > 40% with at least 5 games)
            if (winRate > 40 && totalGames >= 5) {
                flags.push(`Extremely high win rate: ${winRate.toFixed(1)}% (${wins}/${totalGames} games)`);
            }

            // Flag 2: Perfect win rate (won every game they played, min 3 games)
            if (winRate === 100 && totalGames >= 3) {
                flags.push(`Perfect win rate: 100% (${wins}/${totalGames} games)`);
            }

            // Currently we don't track device ID or IP natively in this MVP schema, 
            // but for a real production app we'd add checks like:
            // if (u.deviceFingerprint === otherUser.deviceFingerprint) flags.push('Multiple accounts on device')
            // if (u.recentWithdrawals > 5) flags.push('High frequency withdrawals')

            if (flags.length > 0) {
                suspiciousList.push({
                    userId: u.id,
                    username: u.username || u.firstName,
                    phone: u.phone,
                    balance: u.balance,
                    status: u.status,
                    totalGames,
                    wins,
                    winRate: winRate.toFixed(1),
                    flags,
                    riskScore: flags.length * 50 // Simple scoring
                });
            }
        }

        // Sort by highest risk
        suspiciousList.sort((a, b) => b.riskScore - a.riskScore);

        res.json(suspiciousList);
    } catch (error) {
        console.error('Error fetching suspicious activity:', error);
        res.status(500).json({ error: 'Failed to analyze suspicious activity' });
    }
});

// ==========================================
// Phase 3: Referrals & Rewards
// ==========================================

router.get('/referrals', adminAuthMiddleware, async (req, res) => {
    try {
        // Find all users who have referred someone
        const referrers = await prisma.user.groupBy({
            by: ['referredBy'],
            where: {
                referredBy: { not: null }
            },
            _count: {
                id: true
            }
        });

        const sortedReferrers = referrers.sort((a, b) => b._count.id - a._count.id).slice(0, 50);

        // Fetch detailed info for the top referrers
        const detailedReferrers = await Promise.all(sortedReferrers.map(async (r) => {
            const user = await prisma.user.findUnique({
                where: { id: r.referredBy },
                select: { id: true, username: true, firstName: true, balance: true, giftBalance: true }
            });

            // Count how many of their referrals actually made a deposit (active users)
            const activeReferrals = await prisma.user.count({
                where: {
                    referredBy: r.referredBy,
                    transactions: {
                        some: { type: 'deposit', status: 'completed' }
                    }
                }
            });

            return {
                user,
                totalReferred: r._count.id,
                activeReferred: activeReferrals,
                conversionRate: r._count.id > 0 ? ((activeReferrals / r._count.id) * 100).toFixed(1) : 0
            };
        }));

        res.json(detailedReferrers);
    } catch (error) {
        console.error('Error fetching referrals:', error);
        res.status(500).json({ error: 'Failed to fetch referral data' });
    }
});

router.post('/referrals/reward', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { userId, amount, note } = req.body;
        const adminId = req.admin.id;

        const bonusAmount = parseFloat(amount);
        if (isNaN(bonusAmount) || bonusAmount <= 0) {
            return res.status(400).json({ error: 'Valid positive bonus amount required' });
        }

        const player = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
        if (!player) return res.status(404).json({ error: 'Player not found' });

        const adminUser = await prisma.admin.findUnique({ where: { id: adminId } });

        // Atomic update of giftBalance + logging
        const result = await prisma.$transaction(async (tx) => {
            const updated = await tx.user.update({
                where: { id: parseInt(userId) },
                data: { giftBalance: { increment: bonusAmount } }
            });

            await tx.transaction.create({
                data: {
                    userId: parseInt(userId),
                    type: 'bonus',
                    amount: bonusAmount,
                    status: 'completed',
                    method: 'internal',
                    reference: `ref_bonus_${Date.now()}`,
                    note: `Referral Bonus by Admin: ${note || ''}`
                }
            });

            // Log admin action
            await tx.auditLog.create({
                data: {
                    adminId,
                    action: 'REFERRAL_REWARD',
                    targetId: userId.toString(),
                    targetType: 'user',
                    afterData: JSON.stringify({ amount: bonusAmount }),
                    reason: note
                }
            });

            return updated;
        });

        res.json({ success: true, giftBalance: result.giftBalance, message: 'Bonus rewarded successfully' });

    } catch (error) {
        console.error('Error rewarding referrer:', error);
        res.status(500).json({ error: 'Failed to reward referrer' });
    }
});

// ==========================================
// Phase 3: Settings
// ==========================================

const SETTINGS_FILE = path.join(__dirname, '../../settings.json');

router.get('/settings', adminAuthMiddleware, async (req, res) => {
    try {
        if (!fs.existsSync(SETTINGS_FILE)) {
            // Provide defaults if file missing
            return res.json({
                maintenanceMode: 'false',
                minWithdrawal: '100',
                referralBonus: '50',
                botAnnouncements: ''
            });
        }
        const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});

router.post('/settings', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const newSettings = req.body;

        let currentSettings = {};
        if (fs.existsSync(SETTINGS_FILE)) {
            currentSettings = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
        }

        const mergedSettings = { ...currentSettings, ...newSettings };
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(mergedSettings, null, 2));

        // Log admin action
        await prisma.auditLog.create({
            data: {
                adminId: req.admin.id,
                action: 'UPDATE_SETTINGS',
                targetType: 'system',
                afterData: JSON.stringify({ keysUpdated: Object.keys(newSettings) })
            }
        });

        res.json({ success: true, settings: mergedSettings });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// ==========================================
// Phase 3: Support Tickets
// ==========================================

const TICKETS_FILE = path.join(__dirname, '../../tickets.json');

router.get('/tickets', adminAuthMiddleware, async (req, res) => {
    try {
        if (!fs.existsSync(TICKETS_FILE)) return res.json([]);
        const tickets = JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8'));
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

router.post('/tickets/:id/reply', adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;

        if (!fs.existsSync(TICKETS_FILE)) return res.status(404).json({ error: 'Ticket not found' });

        const tickets = JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8'));
        const ticketIndex = tickets.findIndex(t => t.id === id);

        if (ticketIndex === -1) return res.status(404).json({ error: 'Ticket not found' });

        tickets[ticketIndex].status = 'answered';
        tickets[ticketIndex].replies = tickets[ticketIndex].replies || [];
        tickets[ticketIndex].replies.push({
            from: 'admin',
            adminId: req.admin.id,
            message,
            timestamp: new Date().toISOString()
        });

        fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
        res.json({ success: true, ticket: tickets[ticketIndex] });
    } catch (error) {
        console.error('Error replying to ticket:', error);
        res.status(500).json({ error: 'Failed to reply to ticket' });
    }
});

router.post('/tickets/:id/close', adminAuthMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        if (!fs.existsSync(TICKETS_FILE)) return res.status(404).json({ error: 'Ticket not found' });

        const tickets = JSON.parse(fs.readFileSync(TICKETS_FILE, 'utf8'));
        const ticketIndex = tickets.findIndex(t => t.id === id);

        if (ticketIndex === -1) return res.status(404).json({ error: 'Ticket not found' });

        tickets[ticketIndex].status = 'closed';
        tickets[ticketIndex].closedAt = new Date().toISOString();

        fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
        res.json({ success: true, ticket: tickets[ticketIndex] });
    } catch (error) {
        console.error('Error closing ticket:', error);
        res.status(500).json({ error: 'Failed to close ticket' });
    }
});

// ==========================================
// Phase 3: FAQ Management
// ==========================================

const FAQ_FILE = path.join(__dirname, '../../faq.json');

router.get('/faq', async (req, res) => {
    try {
        if (!fs.existsSync(FAQ_FILE)) return res.json([]);
        const faqs = JSON.parse(fs.readFileSync(FAQ_FILE, 'utf8'));
        res.json(faqs);
    } catch (error) {
        console.error('Error fetching FAQ:', error);
        res.status(500).json({ error: 'Failed to fetch FAQ' });
    }
});

router.post('/faq', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const faqs = req.body;
        if (!Array.isArray(faqs)) return res.status(400).json({ error: 'Array required' });

        fs.writeFileSync(FAQ_FILE, JSON.stringify(faqs, null, 2));

        // Log admin action
        await prisma.auditLog.create({
            data: {
                adminId: req.admin.id,
                action: 'UPDATE_FAQ',
                targetType: 'system',
                afterData: JSON.stringify({ itemsCount: faqs.length })
            }
        });

        res.json({ success: true, faqs });
    } catch (error) {
        console.error('Error updating FAQ:', error);
        res.status(500).json({ error: 'Failed to update FAQ' });
    }
});

// ==========================================
// Phase 3: Announcements & Broadcast
// ==========================================

router.post('/broadcast', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { message, photoUrl, caption, delayMs, base64Image } = req.body;

        if (!message && !photoUrl && !base64Image && !caption) {
            return res.status(400).json({ error: 'Broadcast must contain a message or an image' });
        }

        try {
            // Log as broadcast history
            const HISTORY_FILE = path.join(__dirname, '../../broadcasts.json');
            let history = [];
            if (fs.existsSync(HISTORY_FILE)) {
                history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
            }
            history.push({
                adminId: req.admin.id,
                message: message || caption || '[Image Only]',
                timestamp: new Date().toISOString()
            });
            fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
        } catch (e) {
            console.error('Failed to log broadcast history:', e);
        }

        // Log admin action
        try {
            await prisma.auditLog.create({
                data: {
                    adminId: req.admin.id,
                    action: 'BROADCAST_MESSAGE',
                    targetType: 'system',
                    afterData: JSON.stringify({
                        hasMessage: !!message,
                        hasPhoto: !!photoUrl || !!base64Image
                    })
                }
            });
        } catch (auditErr) {
            console.error('Failed to create audit log:', auditErr);
        }

        // Trigger bot broadcast directly via HTTP to the local bot process
        let chatIds = [];
        try {
            // Get all user telegram IDs
            const allUsers = await prisma.user.findMany({
                select: { telegramId: true }
            });
            chatIds = allUsers.map(u => u.telegramId.toString());
        } catch (prismaErr) {
            console.error('Failed to fetch users from DB:', prismaErr);
            throw prismaErr;
        }

        try {
            // Attempt to send payload to the bot's internal listener port 3010
            fetch('http://localhost:3010/broadcast_batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    photoUrl,
                    caption,
                    base64Image,
                    delayMs: parseInt(delayMs) || 500,
                    chatIds
                })
            }).catch(e => console.error('Bot fetch error:', e.message)); // Non-blocking
        } catch (botError) {
            console.error('Failed to initiate internal fetch to Bot Process:', botError);
        }

        res.json({ success: true, message: 'Broadcast initiated' });
    } catch (error) {
        console.error('Error sending broadcast:', error.stack || error);
        res.status(500).json({ error: error.message || 'Failed to send broadcast' });
    }
});

// ==========================================
// Phase 3: Reports & Analytics
// ==========================================

router.get('/reports', adminAuthMiddleware, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - parseInt(days));

        // 1. Revenue & Volume (Transactions sum)
        const revenueStats = await prisma.transaction.groupBy({
            by: ['type'],
            where: {
                status: 'completed',
                createdAt: { gte: sinceDate }
            },
            _sum: {
                amount: true
            }
        });

        // 2. Daily Growth (Users)
        const userGrowth = await prisma.user.count({
            where: { createdAt: { gte: sinceDate } }
        });

        // 3. Game Volume
        const gamesCount = await prisma.game.count({
            where: { status: 'finished', updatedAt: { gte: sinceDate } }
        });

        // 4. Detailed Daily Revenue (Simplified mock grouping for MVP)
        // In a real app we'd use raw SQL for time-series grouping
        const stats = {
            revenue: revenueStats,
            totalUsers: await prisma.user.count(),
            newUsers: userGrowth,
            finishedGames: gamesCount,
            totalVolume: revenueStats.find(r => r.type === 'bet')?._sum.amount || 0
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// ==========================================
// Phase 3: Audit Logs
// ==========================================

router.get('/audit', adminAuthMiddleware, async (req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: {
                // Since prisma model is simple, we'll manually fetch admin names if needed
                // or just leave it for now
            }
        });

        // Enhance with admin usernames
        const enhancedLogs = await Promise.all(logs.map(async log => {
            const admin = await prisma.admin.findUnique({ where: { id: log.adminId }, select: { username: true } });
            return { ...log, adminUsername: admin?.username || 'Unknown' };
        }));

        res.json(enhancedLogs);
    } catch (error) {
        console.error('Error fetching audit logs:', error);
        res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
});

// ==========================================
// Phase 4: Admin Management
// ==========================================

router.get('/admins', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const admins = await prisma.admin.findMany({
            select: { id: true, username: true, role: true, createdAt: true }
        });
        res.json(admins);
    } catch (error) {
        console.error('Error fetching admins:', error);
        res.status(500).json({ error: 'Failed to fetch admins' });
    }
});

router.post('/admins', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const existing = await prisma.admin.findUnique({ where: { username } });
        if (existing) {
            return res.status(400).json({ error: 'Username already exists' });
        }

        const admin = await prisma.admin.create({
            data: { username, password, role: role || 'admin' }
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.admin.id,
                action: 'CREATE_ADMIN',
                targetType: 'admin',
                targetId: admin.id.toString(),
                reason: `Created admin: ${username}`
            }
        });

        res.status(201).json({ id: admin.id, username: admin.username, role: admin.role });
    } catch (error) {
        console.error('Error creating admin:', error);
        res.status(500).json({ error: 'Failed to create admin' });
    }
});

router.put('/admins/:id', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, role } = req.body;

        const data = {};
        if (username) data.username = username;
        if (password) data.password = password;
        if (role) data.role = role;

        const admin = await prisma.admin.update({
            where: { id: parseInt(id) },
            data
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.admin.id,
                action: 'UPDATE_ADMIN',
                targetType: 'admin',
                targetId: id.toString(),
                reason: `Updated admin: ${admin.username}`
            }
        });

        res.json({ id: admin.id, username: admin.username, role: admin.role });
    } catch (error) {
        console.error('Error updating admin:', error);
        res.status(500).json({ error: 'Failed to update admin' });
    }
});

router.delete('/admins/:id', adminAuthMiddleware, requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Prevent deleting yourself
        if (parseInt(id) === req.admin.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        const admin = await prisma.admin.delete({
            where: { id: parseInt(id) }
        });

        await prisma.auditLog.create({
            data: {
                adminId: req.admin.id,
                action: 'DELETE_ADMIN',
                targetType: 'admin',
                targetId: id.toString(),
                reason: `Deleted admin: ${admin.username}`
            }
        });

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting admin:', error);
        res.status(500).json({ error: 'Failed to delete admin' });
    }
});

module.exports = router;
