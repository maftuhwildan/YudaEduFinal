import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/actions/auth';
import { Role } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== Role.ADMIN) {
            return NextResponse.json(
                { error: 'Unauthorized. Akses ditolak, harus login sebagai Admin.' },
                { status: 401 }
            );
        }

        const classes = await prisma.classGroup.findMany();
        const validClassIds = new Set(classes.map(c => c.id));

        const users = await prisma.user.findMany({ where: { role: Role.USER } });
        const totallyNull = users.filter(u => !u.classId);
        const invalidUsers = users.filter(u => u.classId && !validClassIds.has(u.classId));

        const orphanedUsers = [...invalidUsers, ...totallyNull];

        let recoveryClass = null;
        let recoveryClassName = 'N/A';

        // 1. Fix Orphaned Users
        if (orphanedUsers.length > 0) {
            recoveryClass = classes.find(c => c.name === 'Kelas Pemulihan');
            if (!recoveryClass) {
                recoveryClass = await prisma.classGroup.create({
                    data: { name: 'Kelas Pemulihan' }
                });
            }
            recoveryClassName = recoveryClass.name;

            await prisma.user.updateMany({
                where: { id: { in: orphanedUsers.map(u => u.id) } },
                data: { classId: recoveryClass.id }
            });
        }

        // 2. Fix Orphaned Results
        const results = await prisma.result.findMany();
        const invalidResults = results.filter(r => r.classId && !validClassIds.has(r.classId));

        if (invalidResults.length > 0) {
            if (!recoveryClass) {
                recoveryClass = classes.find(c => c.name === 'Kelas Pemulihan');
                if (!recoveryClass) {
                    recoveryClass = await prisma.classGroup.create({
                        data: { name: 'Kelas Pemulihan' }
                    });
                }
                recoveryClassName = recoveryClass.name;
            }

            await prisma.result.updateMany({
                where: { id: { in: invalidResults.map(r => r.id) } },
                data: { classId: recoveryClass.id }
            });
        }

        // 3. Fix Orphaned Exam Sessions
        const sessions = await prisma.examSession.findMany();
        const invalidSessions = sessions.filter(s => s.classId && !validClassIds.has(s.classId));

        if (invalidSessions.length > 0) {
            if (!recoveryClass) {
                recoveryClass = classes.find(c => c.name === 'Kelas Pemulihan');
                if (!recoveryClass) {
                    recoveryClass = await prisma.classGroup.create({
                        data: { name: 'Kelas Pemulihan' }
                    });
                }
                recoveryClassName = recoveryClass.name;
            }

            for (const session of invalidSessions) {
                await prisma.examSession.update({
                    where: { userId_packId: { userId: session.userId, packId: session.packId } },
                    data: { classId: recoveryClass.id }
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Database berhasil diperbaiki!',
            fixedUsers: orphanedUsers.length,
            fixedResults: invalidResults.length,
            fixedSessions: invalidSessions.length,
            recoveryClassName,
            instruction: orphanedUsers.length > 0 || invalidResults.length > 0
                ? `Silakan masuk ke menu Manajemen Siswa, lalu hapus siswa dari '${recoveryClassName}' dan buat ulang mereka (atau biarkan di kelas tersebut dan ganti nama kelasnya jika perlu) karena saat ini fitur Edit Siswa belum tersedia.`
                : 'Tidak ada data error yang ditemukan.'
        });

    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Error tidak diketahui' }, { status: 500 });
    }
}
