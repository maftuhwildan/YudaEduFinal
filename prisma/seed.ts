import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {

    const passwordAdmin = await hash('admin123', 12);

    await prisma.user.upsert({
        where: { username: 'admin' },
        update: {
            passwordHash: passwordAdmin // <--- Biar kalau di-seed ulang, passwordnya ke-update
        },
        create: {
            id: 'admin-1',
            username: 'admin',
            fullName: 'Administrator',
            passwordHash: passwordAdmin, // <--- Pakai yang sudah di-hash
            role: Role.ADMIN,
            maxAttempts: 100,
            currentAttempts: 0,
        },
    });

    const classData = await prisma.classGroup.upsert({
        where: { id: 'class-12-a' },
        update: {},
        create: {
            id: 'class-12-a',
            name: '12 IPA 1'
        },
    });

    // Quiz Pack
    const pack = await prisma.quizPack.upsert({
        where: { id: 'pack-eco-1' },
        update: {},
        create: {
            id: 'pack-eco-1',
            name: 'Economics Final Exam',
            isActive: true,
            timeLimit: 60,
            token: 'EXAM2024',
            allowedClassIds: [classData.id],
            randomizeQuestions: true,
            randomizeOptions: true,
            autoRotateToken: false
        },
    });

    // Question
    await prisma.question.upsert({
        where: { id: 'q1' },
        update: {},
        create: {
            id: 'q1',
            packId: pack.id,
            variant: 'A',
            stimulus: '<h3>Economic Growth Data</h3><p>Consider a country with a GDP growth of 5% in 2023 driven by export...</p>',
            text: '<p>Based on the text, what is the primary driver of growth?</p>',
            options: ['<p>Consumption</p>', '<p>Investment</p>', '<p>Export</p>', '<p>Government Spending</p>'],
            correctAnswer: '<p>Export</p>'
        }
    });

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
