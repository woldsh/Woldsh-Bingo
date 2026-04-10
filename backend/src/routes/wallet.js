const express = require('express');
const prisma = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/wallet/balance - Get user balance
 */
router.get('/balance', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { balance: true }
        });

        res.json({ balance: Number(user.balance) });
    } catch (error) {
        console.error('Error getting balance:', error);
        res.status(500).json({ error: 'Failed to get balance' });
    }
});

/**
 * POST /api/wallet/deposit - Create a deposit request
 */
router.post('/deposit', authMiddleware, async (req, res) => {
    try {
        const { amount, reference, screenshotBase64 } = req.body;

        if (!amount || amount < 10) {
            return res.status(400).json({ error: 'Minimum deposit is 10 ETB' });
        }

        const transaction = await prisma.transaction.create({
            data: {
                userId: req.user.id,
                type: 'deposit',
                amount: parseFloat(amount),
                status: 'pending',
                reference: reference || null,
                note: `Deposit of ${amount} ETB`,
            }
        });

        // Notify Admin via the bot's internal HTTP server
        try {
            const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '7570292128';
            let bankName = reference || 'Unknown / Check Receipt';
            // Simple heuristic to guess bank if user provided 09... or 1000... in reference
            if (reference && reference.startsWith('09')) bankName = 'Telebirr';
            if (reference && reference.startsWith('10')) bankName = 'CBE Birr';
            
            const adminMsg = `🏦 *NEW DEPOSIT REQUEST*\n\n` +
                             `👤 User ID: ${req.user.telegramId}\n` +
                             `🗣 Name: ${req.user.firstName || 'User'}\n` +
                             `🔗 Username: ${req.user.username ? '@'+req.user.username : 'No Username'}\n` +
                             `📱 Phone: ${req.user.phone || 'Unknown'}\n` +
                             `💰 Amount: ${parseFloat(amount).toFixed(2)} ETB\n` +
                             `🏦 Bank: ${bankName}`;
                             
            console.log(`[Deposit] Attempting to notify admin ${ADMIN_CHAT_ID}`);
            console.log(`[Deposit] Has screenshot?`, !!screenshotBase64);

            // 1. Notify Admin with image
            fetch('http://localhost:3010/broadcast_batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...(screenshotBase64 ? { caption: adminMsg, base64Image: screenshotBase64 } : { message: adminMsg }),
                    chatIds: [ADMIN_CHAT_ID]
                })
            }).then(r => r.json()).then(data => {
                console.log('[Deposit] Admin notification response:', data);
            }).catch(e => console.error('Failed to notify admin via bot server:', e.message));

            // 2. Notify the User themselves
            const userMsg = `✅ *Receipt screenshot received!*\n\n` +
                            `Amount: ${parseFloat(amount).toFixed(2)} ETB\n` +
                            `Bank: ${bankName}\n\n` +
                            `Your deposit is being verified. You will be notified once confirmed.\n` +
                            `ክፍያዎ እየተረጋገጠ ነው። ሲረጋገጥ ይሳወቃሉ።`;
                            
            fetch('http://localhost:3010/broadcast_batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    chatIds: [req.user.telegramId.toString()]
                })
            }).catch(e => console.error('Failed to notify user via bot server:', e.message));
        } catch (e) {
            console.error('Error sending telegram deposit notifications:', e);
        }

        res.json({
            message: 'Deposit request created. An admin will confirm it shortly.',
            transaction: {
                id: transaction.id,
                amount: Number(transaction.amount),
                status: transaction.status,
            }
        });
    } catch (error) {
        console.error('Error creating deposit:', error);
        res.status(500).json({ error: 'Failed to create deposit' });
    }
});

/**
 * POST /api/wallet/withdraw - Create a withdrawal request
 */
router.post('/withdraw', authMiddleware, async (req, res) => {
    try {
        const { amount, phone } = req.body;

        const reqAmount = parseFloat(amount);
        if (!reqAmount || reqAmount < 100) {
            return res.status(400).json({ error: 'Minimum manual withdrawal is 100 Birr' });
        }

        // Fetch fresh balance from DB to avoid stale data
        const freshUser = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { giftBalance: true }
        });
        const currentPlayBalance = Number(freshUser.giftBalance);

        if (currentPlayBalance < reqAmount) {
            return res.status(400).json({ error: `Insufficient Play Wallet balance. You have ${currentPlayBalance.toFixed(0)} Birr.` });
        }

        if (currentPlayBalance - reqAmount < 10) {
            return res.status(400).json({ error: 'You must leave a minimum remaining Play Wallet balance of 10 Birr' });
        }

        // Verify deposit & win rules
        const [depositCount, winCount] = await Promise.all([
            prisma.transaction.count({
                where: { userId: req.user.id, type: 'deposit', status: 'completed' }
            }),
            prisma.gamePlayer.count({
                where: { userId: req.user.id, isWinner: true }
            })
        ]);

        if (depositCount < 1) {
            return res.status(400).json({ error: 'At least 1 previous deposit required' });
        }
        if (winCount < 2) {
            return res.status(400).json({ error: 'At least 2 game wins required' });
        }

        // Deduct balance and create transaction
        const [transaction] = await prisma.$transaction([
            prisma.transaction.create({
                data: {
                    userId: req.user.id,
                    type: 'withdraw',
                    amount: parseFloat(amount),
                    status: 'pending',
                    reference: phone || null,
                    note: `Withdrawal of ${amount} ETB to ${phone || 'N/A'}`,
                }
            }),
            prisma.user.update({
                where: { id: req.user.id },
                data: { giftBalance: { decrement: parseFloat(amount) } }
            })
        ]);

        // Notify Admin via the bot's internal HTTP server
        try {
            const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || '7570292128';
            let bankName = phone || 'Unknown';
            if (phone && phone.startsWith('09')) bankName = 'Telebirr (' + phone + ')';
            if (phone && phone.startsWith('10')) bankName = 'CBE Birr (' + phone + ')';
            
            const adminMsg = `🏧 *NEW WITHDRAW REQUEST*\n\n` +
                             `👤 User ID: ${req.user.telegramId}\n` +
                             `🗣 Name: ${req.user.firstName || 'User'}\n` +
                             `🔗 Username: ${req.user.username ? '@'+req.user.username : 'No Username'}\n` +
                             `📱 Phone: ${req.user.phone || 'Unknown'}\n` +
                             `💰 Amount: ${parseFloat(amount).toFixed(2)} ETB\n` +
                             `🏦 Bank/Reference: ${bankName}`;
                             
            console.log(`[Withdraw] Attempting to notify admin ${ADMIN_CHAT_ID}`);
            
            // 1. Notify Admin
            fetch('http://localhost:3010/broadcast_batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: adminMsg,
                    chatIds: [ADMIN_CHAT_ID]
                })
            }).then(r => r.json()).then(data => {
                console.log('[Withdraw] Admin notification response:', data);
            }).catch(e => console.error('Failed to notify admin via bot server:', e.message));

            // 2. Notify the User themselves
            const userMsg = `🏧 *Withdrawal Request Received!*\n\n` +
                            `Amount: ${parseFloat(amount).toFixed(2)} ETB\n` +
                            `Destination: ${bankName}\n\n` +
                            `Your request is being processed. It will be sent to you shortly.\n` +
                            `ጥያቄዎ እየተስተናገደ ነው። በቅርቡ ይላክሎታል።`;
                            
            fetch('http://localhost:3010/broadcast_batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMsg,
                    chatIds: [req.user.telegramId.toString()]
                })
            }).catch(e => console.error('Failed to notify user via bot server:', e.message));
        } catch (e) {
            console.error('Error sending telegram withdrawal notifications:', e);
        }

        res.json({
            message: 'Withdrawal request created. You will receive it within 24 hours.',
            transaction: {
                id: transaction.id,
                amount: Number(transaction.amount),
                status: transaction.status,
            }
        });
    } catch (error) {
        console.error('Error creating withdrawal:', error);
        res.status(500).json({ error: 'Failed to create withdrawal' });
    }
});

/**
 * GET /api/wallet/transactions - Get transaction history
 */
router.get('/transactions', authMiddleware, async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        res.json({
            transactions: transactions.map(t => ({
                id: t.id,
                type: t.type,
                amount: Number(t.amount),
                status: t.status,
                note: t.note,
                createdAt: t.createdAt,
            }))
        });
    } catch (error) {
        console.error('Error getting transactions:', error);
        res.status(500).json({ error: 'Failed to get transactions' });
    }
});

module.exports = router;
