const prisma = require('./src/lib/prisma');

async function seedTemplates() {
    console.log('Seeding default room templates...');

    const defaults = [
        { name: 'Weyra', stake: 10, prize: 36, maxPlayers: 4, theme: 'blue', sortOrder: 1 },
        { name: 'Fortune', stake: 20, prize: 72, maxPlayers: 4, theme: 'green', sortOrder: 2 },
        { name: 'Buna', stake: 50, prize: 450, maxPlayers: 10, theme: 'red', sortOrder: 3 },
    ];

    for (const t of defaults) {
        // Check if template with this stake already exists
        const existing = await prisma.roomTemplate.findFirst({
            where: { stake: t.stake }
        });

        if (existing) {
            console.log(`  ✓ "${t.name}" (${t.stake} ETB) already exists (id: ${existing.id})`);
        } else {
            const created = await prisma.roomTemplate.create({ data: t });
            console.log(`  + Created "${t.name}" (${t.stake} ETB) → id: ${created.id}`);
        }
    }

    console.log('\nDone! All default templates are now in the database.');
    await prisma.$disconnect();
}

seedTemplates().catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
});
