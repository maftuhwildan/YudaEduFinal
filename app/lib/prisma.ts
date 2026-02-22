import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

function createPrismaClient() {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
}

// In development: reuse across hot-reloads
// In production: also reuse to avoid creating too many connections
export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
// Also cache in production to prevent connection churn on serverless/shared hosting
if (process.env.NODE_ENV === 'production') globalForPrisma.prisma = prisma;
