const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    // Seed the super admin
    const existing = await prisma.admin.findUnique({ where: { username: 'woldsh' } });
    if (!existing) {
        await prisma.admin.create({
            data: {
                username: 'woldsh',
                password: '12123668',
                role: 'super_admin'
            }
        });
        console.log('✅ Super admin "woldsh" created successfully!');
    } else {
        console.log('ℹ️ Super admin "woldsh" already exists.');
    }
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
