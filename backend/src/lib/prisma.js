const { PrismaClient } = require('@prisma/client');

// Singleton pattern - reuse a single PrismaClient instance
// This prevents connection pool exhaustion on Supabase
const globalForPrisma = globalThis;

const prisma = globalForPrisma.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

module.exports = prisma;
