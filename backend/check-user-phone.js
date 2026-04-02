const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
    try {
        const telegramId = 7570292128n; // Dev user ID
        const user = await prisma.user.findUnique({
            where: { telegramId: telegramId }
        });

        if (user) {
            console.log('USER_INFO_START');
            console.log(JSON.stringify({
                id: user.id,
                telegramId: user.telegramId.toString(),
                username: user.username,
                phone: user.phone,
                balance: user.balance
            }, null, 2));
            console.log('USER_INFO_END');
        } else {
            console.log('User not found in database.');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
}

checkUser();
