const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');
const crypto = require('crypto');

async function main() {
    const prisma = new PrismaClient();
    try {
        const adminPassword = process.env.ADMIN_INITIAL_PASSWORD || 'admin123';
        if (adminPassword === 'admin123') {
            console.warn('⚠️  WARNING: Using default password "admin123". Set ADMIN_INITIAL_PASSWORD env var for production!');
        }
        const passwordHash = await hash(adminPassword, 12);
        const admin = await prisma.user.create({
            data: {
                id: crypto.randomUUID(),
                username: 'admin',
                fullName: 'Administrator',
                passwordHash: passwordHash,
                role: 'ADMIN',
            },
        });
        console.log('Admin account created successfully!');
        console.log('Username: admin');
    } catch (e) {
        if (e.code === 'P2002') {
            console.log('Admin account already exists.');
        } else {
            throw e;
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
