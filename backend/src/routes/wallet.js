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
        const { amount, reference } = req.body;

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

        if (req.user.balance - reqAmount < 10) {
            return res.status(400).json({ error: 'You must leave a minimum remaining balance of 10 Birr' });
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
                data: { balance: { decrement: parseFloat(amount) } }
            })
        ]);

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
