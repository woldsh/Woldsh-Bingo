const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixStuckGames() {
    console.log('Fixing stuck playing games...');
    const result = await prisma.game.updateMany({
        where: { status: 'playing' },
        data: { status: 'completed' }
    });
    console.log(`Updated ${result.count} stuck games to completed.`);
    process.exit(0);
}

fixStuckGames().catch(console.error);
