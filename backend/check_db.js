const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSettings() {
  const settings = await prisma.setting.findMany();
  console.log('--- ALL SETTINGS ---');
  settings.forEach(s => {
    console.log(`${s.key}: "${s.value}"`);
  });
  console.log('--------------------');
}

checkSettings().finally(() => prisma.$disconnect());
