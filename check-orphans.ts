import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Fetching data from DB...");

    const users = await prisma.user.findMany({
        where: { role: 'USER' },
        select: { id: true, username: true, fullName: true, classId: true }
    });

    const classes = await prisma.classGroup.findMany();
    const classIds = new Set(classes.map(c => c.id));

    const ghosts = users.filter(u => u.classId && !classIds.has(u.classId));
    const totallyNull = users.filter(u => !u.classId);

    console.log("\n=== USERS WITH INVALID CLASS ID ===");
    console.log(`Total: ${ghosts.length}`);

    // Group them by the invalid class ID to see how many classes were deleted
    const missingClassMap = new Map<string, typeof ghosts>();
    ghosts.forEach(g => {
        const arr = missingClassMap.get(g.classId!) || [];
        arr.push(g);
        missingClassMap.set(g.classId!, arr);
    });

    for (const [cId, students] of missingClassMap.entries()) {
        console.log(`\nDeleted Class ID: ${cId} (${students.length} students)`);
        students.slice(0, 5).forEach(o => console.log(`  - ${o.username} (${o.fullName})`));
        if (students.length > 5) console.log(`  ...and ${students.length - 5} more.`);
    }

    console.log("\n=== USERS TRULY WITHOUT CLASS (classId = null) ===");
    console.log(`Total: ${totallyNull.length}`);

    // Check Results table for invalid class IDs
    const results = await prisma.result.findMany({
        select: { id: true, classId: true, username: true, packName: true }
    });
    const invalidResults = results.filter(r => r.classId && !classIds.has(r.classId));
    console.log(`\n=== RESULTS WITH DELETED CLASS IDs ===`);
    console.log(`Total: ${invalidResults.length} results.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
