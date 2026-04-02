const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        console.log('Testing dashboard queries...');
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
                where: { type: 'deposit', status: 'completed' },
                _sum: { amount: true },
                _count: true
            }),
            prisma.transaction.aggregate({
                where: { type: 'withdraw', status: 'completed' },
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

        console.log('SUCCESS!');
        console.log({
            totalPlayers,
            playersToday,
            activeGames,
            totalGames,
            totalDeposited,
            totalWithdrawn,
            bannedPlayers
        });

    } catch (error) {
        console.error('FAILED with error:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

test();
