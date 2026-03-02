'use server';

import { prisma } from '../lib/prisma';
import { hash } from 'bcrypt';
import { requireAdmin } from '@/lib/auth-guard';
import { randomInt, randomUUID } from 'crypto';
import { logger } from '@/lib/logger';

// --- Users ---
export async function getUsers() {
    await requireAdmin();
    try {
        return await prisma.user.findMany({ include: { class: true } });
    } catch (e: any) {
        throw new Error('Gagal memuat data pengguna.');
    }
}

export async function createUser(data: any) {
    await requireAdmin();
    try {
        const { password, ...rest } = data;
        const hashedPassword = await hash(password || rest.passwordHash, 12);
        const userData = { ...rest, passwordHash: hashedPassword };
        await prisma.user.create({ data: userData });
        return { success: true };
    } catch (e: any) {
        if (e.code === 'P2002') return { error: 'Username sudah digunakan.' };
        return { error: 'Gagal membuat user. Silakan coba lagi.' };
    }
}

export async function deleteUser(id: string) {
    await requireAdmin();
    try {
        await prisma.user.delete({ where: { id } });
        return { success: true };
    } catch (e: any) {
        if (e.code === 'P2003') return { error: 'User ini masih memiliki data terkait, tidak bisa dihapus.' };
        return { error: 'Gagal menghapus user.' };
    }
}

export async function bulkDeleteUsers(ids: string[]) {
    await requireAdmin();
    try {
        await prisma.$transaction([
            // Delete related sessions first to avoid FK constraint errors
            prisma.examSession.deleteMany({ where: { userId: { in: ids } } }),
            prisma.result.deleteMany({ where: { userId: { in: ids } } }),
            prisma.user.deleteMany({ where: { id: { in: ids } } }),
        ]);
        return { success: true };
    } catch (e: any) {
        return { error: 'Gagal menghapus siswa secara massal.' };
    }
}

// Reset user attempts for a specific pack (allows retake)
export async function resetUserAttempts(userId: string, packId: string) {
    await requireAdmin();
    try {
        const pack = await prisma.quizPack.findUnique({ where: { id: packId }, select: { name: true } });
        if (!pack) return { error: 'Paket ujian tidak ditemukan.' };

        await prisma.$transaction([
            // Delete the completed session so user can retake
            prisma.examSession.deleteMany({
                where: { userId, packId }
            }),
            // NOTE (Option 2): We intentionally DO NOT delete the Result record 
            // to maintain a permanent history of past attempts.

            // Decrement currentAttempts and increment maxAttempts to track retakes granted
            prisma.user.update({
                where: { id: userId },
                data: {
                    currentAttempts: { decrement: 1 },
                    maxAttempts: { increment: 1 }
                }
            })
        ]);

        return { success: true };
    } catch (e: any) {
        return { error: 'Gagal mereset percobaan user. Transaksi dibatalkan.' };
    }
}

// --- Classes ---
export async function getClasses() {
    await requireAdmin();
    try {
        return await prisma.classGroup.findMany();
    } catch (e: any) {
        throw new Error('Gagal memuat data kelas.');
    }
}

export async function createClass(data: any) {
    await requireAdmin();
    try {
        await prisma.classGroup.create({ data });
        return { success: true };
    } catch (e: any) {
        if (e.code === 'P2002') return { error: 'Nama kelas sudah ada.' };
        return { error: 'Gagal membuat kelas.' };
    }
}

export async function updateClass(id: string, name: string) {
    await requireAdmin();
    try {
        await prisma.classGroup.update({ where: { id }, data: { name } });
        return { success: true };
    } catch (e: any) {
        if (e.code === 'P2002') return { error: 'Nama kelas sudah ada.' };
        return { error: 'Gagal mengupdate kelas.' };
    }
}

export async function deleteClass(id: string) {
    await requireAdmin();
    try {
        await prisma.classGroup.delete({ where: { id } });
        return { success: true };
    } catch (e: any) {
        if (e.code === 'P2003') return { error: 'Kelas masih memiliki siswa, tidak bisa dihapus.' };
        return { error: 'Gagal menghapus kelas.' };
    }
}

// --- Packs ---

// Helper function to generate random token (cryptographically secure)
function generateRandomToken(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 6 }, () => chars[randomInt(chars.length)]).join('');
}

export async function getPacks() {
    await requireAdmin();
    try {
        const packs = await prisma.quizPack.findMany();

        // Check for auto-rotate tokens
        const now = new Date();
        const fiveMinutesMs = 5 * 60 * 1000;

        for (const pack of packs) {
            if (pack.autoRotateToken && pack.isActive) {
                const lastUpdate = pack.lastTokenUpdate ? new Date(pack.lastTokenUpdate).getTime() : 0;
                const timeSinceUpdate = now.getTime() - lastUpdate;

                if (timeSinceUpdate >= fiveMinutesMs) {
                    // Atomic token rotation: conditional update only succeeds for the first
                    // concurrent caller (WHERE lastTokenUpdate = old value prevents double-rotate)
                    const newToken = generateRandomToken();
                    const rotated = await prisma.quizPack.updateMany({
                        where: {
                            id: pack.id,
                            lastTokenUpdate: pack.lastTokenUpdate, // must still match current DB value
                        },
                        data: { token: newToken, lastTokenUpdate: now },
                    });
                    if (rotated.count > 0) {
                        pack.token = newToken;
                        pack.lastTokenUpdate = now;
                    }
                    // If count === 0, another request already rotated — pack.token stays
                    // as the value from the initial findMany (which may be stale).
                    // Re-fetch to get the current token.
                    else {
                        const fresh = await prisma.quizPack.findUnique({
                            where: { id: pack.id },
                            select: { token: true, lastTokenUpdate: true },
                        });
                        if (fresh) {
                            pack.token = fresh.token;
                            pack.lastTokenUpdate = fresh.lastTokenUpdate;
                        }
                    }
                }
            }
        }

        return packs;
    } catch (e: any) {
        throw new Error('Gagal memuat data paket ujian.');
    }
}

export async function createPack(data: any) {
    await requireAdmin();
    try {
        if (data.scheduleStart) data.scheduleStart = new Date(data.scheduleStart).toISOString();
        if (data.scheduleEnd) data.scheduleEnd = new Date(data.scheduleEnd).toISOString();
        // Set lastTokenUpdate if autoRotateToken is enabled
        if (data.autoRotateToken) {
            data.lastTokenUpdate = new Date();
        }
        await prisma.quizPack.create({ data });
        return { success: true };
    } catch (e: any) {
        return { error: 'Gagal membuat paket ujian.' };
    }
}

export async function updatePack(data: any) {
    await requireAdmin();
    try {
        const { id, ...rest } = data;
        if (rest.scheduleStart) rest.scheduleStart = new Date(rest.scheduleStart).toISOString();
        else if (rest.scheduleStart === '') rest.scheduleStart = null;

        if (rest.scheduleEnd) rest.scheduleEnd = new Date(rest.scheduleEnd).toISOString();
        else if (rest.scheduleEnd === '') rest.scheduleEnd = null;

        await prisma.quizPack.update({ where: { id }, data: rest });
        return { success: true };
    } catch (e: any) {
        return { error: 'Gagal mengupdate paket ujian.' };
    }
}

export async function duplicatePack(sourcePackId: string, newPackId: string, newName: string, newToken: string) {
    await requireAdmin();
    try {
        const sourcePack = await prisma.quizPack.findUnique({ where: { id: sourcePackId } });
        if (!sourcePack) return { error: 'Pack sumber tidak ditemukan.' };

        const sourceQuestions = await prisma.question.findMany({ where: { packId: sourcePackId } });

        const { id: _id, ...packData } = sourcePack as any;

        await prisma.$transaction([
            prisma.quizPack.create({
                data: {
                    ...packData,
                    id: newPackId,
                    name: newName,
                    isActive: false,
                    token: newToken,
                    lastTokenUpdate: null,
                },
            }),
            ...sourceQuestions.map((q: any) => {
                const { id: _qid, packId: _packId, ...qData } = q;
                return prisma.question.create({
                    data: { ...qData, id: randomUUID(), packId: newPackId },
                });
            }),
        ]);

        return { success: true };
    } catch (e: any) {
        return { error: 'Gagal menduplikasi paket ujian.' };
    }
}

export async function deletePack(id: string) {
    await requireAdmin();
    try {
        await prisma.quizPack.delete({ where: { id } });
        return { success: true };
    } catch (e: any) {
        if (e.code === 'P2003') return { error: 'Paket ujian masih memiliki data terkait.' };
        return { error: 'Gagal menghapus paket ujian.' };
    }
}

// --- Questions ---
export async function getQuestions() {
    await requireAdmin();
    try {
        return await prisma.question.findMany({ orderBy: { createdAt: 'asc' } });
    } catch (e: any) {
        throw new Error('Gagal memuat data soal.');
    }
}

export async function getQuestionsByPack(packId: string) {
    await requireAdmin();
    try {
        return await prisma.question.findMany({
            where: { packId },
            orderBy: { createdAt: 'asc' }
        });
    } catch (e: any) {
        throw new Error('Gagal memuat soal untuk paket ini.');
    }
}

export async function createQuestion(data: any) {
    await requireAdmin();
    try {
        await prisma.question.create({ data });
        return { success: true };
    } catch (e: any) {
        return { error: 'Gagal membuat soal.' };
    }
}

export async function updateQuestion(data: any) {
    await requireAdmin();
    try {
        const { id, ...rest } = data;
        await prisma.question.update({ where: { id }, data: rest });
        return { success: true };
    } catch (e: any) {
        return { error: 'Gagal mengupdate soal.' };
    }
}

export async function deleteQuestion(id: string) {
    await requireAdmin();
    try {
        await prisma.question.delete({ where: { id } });
        return { success: true };
    } catch (e: any) {
        return { error: 'Gagal menghapus soal.' };
    }
}

// --- Results ---
export async function getAllResults() {
    await requireAdmin();
    try {
        return await prisma.result.findMany();
    } catch (e: any) {
        throw new Error('Gagal memuat data hasil ujian.');
    }
}

export async function getResultsByPack(packName: string) {
    await requireAdmin();
    try {
        return await prisma.result.findMany({ where: { packName } });
    } catch (e: any) {
        throw new Error('Gagal memuat hasil ujian untuk paket ini.');
    }
}

export async function deleteResult(id: string) {
    await requireAdmin();
    try {
        await prisma.result.delete({ where: { id } });
        return { success: true };
    } catch (e: any) {
        return { error: 'Gagal menghapus hasil ujian.' };
    }
}

export async function bulkDeleteResults(ids: string[]) {
    await requireAdmin();
    try {
        await prisma.result.deleteMany({ where: { id: { in: ids } } });
        return { success: true };
    } catch (e: any) {
        return { error: 'Gagal menghapus hasil ujian secara massal.' };
    }
}

// WARN-1 FIX: Batch operations instead of N+1 sequential queries
export async function bulkResetUserAttempts(userIds: string[], packId: string) {
    await requireAdmin();
    try {
        const pack = await prisma.quizPack.findUnique({ where: { id: packId }, select: { name: true } });
        if (!pack) return { error: 'Paket ujian tidak ditemukan.' };

        await prisma.$transaction([
            // Batch delete all sessions at once
            prisma.examSession.deleteMany({
                where: { userId: { in: userIds }, packId }
            }),
            // NOTE (Option 2): We intentionally DO NOT delete Result records 
            // to maintain a permanent history.

            // Individual updates still needed for increment/decrement, but wrapped in transaction
            ...userIds.map(userId =>
                prisma.user.update({
                    where: { id: userId },
                    data: {
                        currentAttempts: { decrement: 1 },
                        maxAttempts: { increment: 1 }
                    }
                })
            )
        ]);
        return { success: true };
    } catch (e: any) {
        return { error: 'Gagal mereset percobaan secara massal. Transaksi dibatalkan.' };
    }
}

// --- Analysis ---
export async function getAnalysis(packId: string) {
    await requireAdmin();
    try {
        // Get pack info
        const pack = await prisma.quizPack.findUnique({ where: { id: packId } });
        if (!pack) return { questions: [], summary: null };

        // Get all questions for this pack
        const questions = await prisma.question.findMany({
            where: { packId },
            orderBy: { createdAt: 'asc' }
        });

        // Get all raw results for this pack (includes historical retakes)
        const rawResults = await prisma.result.findMany({
            where: { packName: pack.name },
            include: { user: { include: { class: true } } }
        });

        // OPTION 2: HIGHEST SCORE POLICY
        // Group by user and only keep the attempt with the maximum score
        const userHighestScores = new Map<string, any>();
        rawResults.forEach((r: any) => {
            const existing = userHighestScores.get(r.userId);
            if (!existing || r.score > existing.score) {
                userHighestScores.set(r.userId, r);
            }
        });
        const results = Array.from(userHighestScores.values());

        // Parse answers from each result
        const parsedResults = results.map((r: any) => {
            let answerMap: Record<string, string> = {};
            if (r.answers) {
                if (typeof r.answers === 'string') {
                    try { answerMap = JSON.parse(r.answers); } catch (e) { }
                } else if (typeof r.answers === 'object' && !Array.isArray(r.answers)) {
                    const keys = Object.keys(r.answers);
                    const isLegacy = keys.length <= 3 && keys.some(k => ['correctCount', 'totalQuestions', 'cheatCount'].includes(k));
                    if (!isLegacy) {
                        answerMap = r.answers as Record<string, string>;
                    }
                }
            }
            return { ...r, answerMap };
        });

        const hasRealAnswers = parsedResults.some(r => Object.keys(r.answerMap).length > 0);

        // Calculate per-question statistics
        const questionStats = questions.map((q: any) => {
            let attempts = 0;
            let correctCount = 0;
            const optionCounts: Record<string, number> = {};

            const opts: string[] = Array.isArray(q.options)
                ? q.options
                : (typeof q.options === 'string' ? (() => { try { return JSON.parse(q.options); } catch { return []; } })() : []);
            opts.forEach((_: string, idx: number) => {
                optionCounts[String.fromCharCode(65 + idx)] = 0;
            });

            if (hasRealAnswers) {
                parsedResults.forEach(r => {
                    if (r.variant === q.variant || !q.variant) {
                        const studentAnswer = r.answerMap[q.id];
                        if (studentAnswer !== undefined) {
                            attempts++;
                            if (studentAnswer === q.correctAnswer) correctCount++;
                            const optIdx = opts.findIndex((o: string) => o === studentAnswer);
                            if (optIdx >= 0) {
                                const label = String.fromCharCode(65 + optIdx);
                                optionCounts[label] = (optionCounts[label] || 0) + 1;
                            }
                        }
                    }
                });
            } else {
                const variantResults = parsedResults.filter(r => r.variant === q.variant || !q.variant);
                attempts = variantResults.length;
                const avgScore = attempts > 0
                    ? variantResults.reduce((sum: number, r: any) => sum + r.score, 0) / attempts : 0;
                correctCount = Math.round(attempts * (avgScore / 100));
            }

            const difficultyIndex = attempts > 0 ? correctCount / attempts : 0;
            const correctOptIdx = opts.findIndex((o: string) => o === q.correctAnswer);
            const correctLabel = correctOptIdx >= 0 ? String.fromCharCode(65 + correctOptIdx) : '?';

            return {
                questionId: q.id,
                text: q.text,
                variant: q.variant,
                options: opts,
                attempts,
                correctCount,
                difficultyIndex: parseFloat(difficultyIndex.toFixed(2)),
                optionCounts: hasRealAnswers ? optionCounts : null,
                correctLabel,
                optionLabels: opts.map((_: string, idx: number) => String.fromCharCode(65 + idx))
            };
        });

        // Summary statistics
        const totalStudents = results.length;
        const scores = results.map((r: any) => r.score);
        const avgScore = totalStudents > 0
            ? scores.reduce((sum: number, s: number) => sum + s, 0) / totalStudents : 0;
        const highestScore = totalStudents > 0 ? Math.max(...scores) : 0;
        const lowestScore = totalStudents > 0 ? Math.min(...scores) : 0;

        // Median
        const sortedScores = [...scores].sort((a, b) => a - b);
        const median = totalStudents > 0
            ? (totalStudents % 2 === 0
                ? (sortedScores[totalStudents / 2 - 1] + sortedScores[totalStudents / 2]) / 2
                : sortedScores[Math.floor(totalStudents / 2)])
            : 0;

        // Standard Deviation
        const stdDev = totalStudents > 0
            ? Math.sqrt(scores.reduce((sum: number, s: number) => sum + Math.pow(s - avgScore, 2), 0) / totalStudents) : 0;

        // Score distribution
        const distribution = {
            excellent: results.filter((r: any) => r.score >= 90).length,
            good: results.filter((r: any) => r.score >= 75 && r.score < 90).length,
            average: results.filter((r: any) => r.score >= 60 && r.score < 75).length,
            poor: results.filter((r: any) => r.score < 60).length
        };

        const passCount = results.filter((r: any) => r.score >= 75).length;
        const passRate = totalStudents > 0 ? (passCount / totalStudents) * 100 : 0;

        const avgCheatCount = totalStudents > 0
            ? results.reduce((sum: number, r: any) => sum + (r.cheatCount || 0), 0) / totalStudents : 0;

        // Per-class breakdown
        const classMap: Record<string, { name: string; scores: number[]; passCount: number }> = {};
        results.forEach((r: any) => {
            const className = r.user?.class?.name || 'Unknown';
            const classId = r.user?.classId || 'unknown';
            if (!classMap[classId]) classMap[classId] = { name: className, scores: [], passCount: 0 };
            classMap[classId].scores.push(r.score);
            if (r.score >= 75) classMap[classId].passCount++;
        });

        const perClass = Object.entries(classMap).map(([classId, data]) => {
            const n = data.scores.length;
            const avg = data.scores.reduce((s, v) => s + v, 0) / n;
            const sorted = [...data.scores].sort((a, b) => a - b);
            const med = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
            const sd = Math.sqrt(data.scores.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / n);
            return {
                classId,
                className: data.name,
                studentCount: n,
                avgScore: Math.round(avg),
                passRate: parseFloat(((data.passCount / n) * 100).toFixed(1)),
                highest: Math.round(Math.max(...data.scores)),
                lowest: Math.round(Math.min(...data.scores)),
                median: Math.round(med),
                stdDev: parseFloat(sd.toFixed(1)),
                distribution: {
                    excellent: data.scores.filter(s => s >= 90).length,
                    good: data.scores.filter(s => s >= 75 && s < 90).length,
                    average: data.scores.filter(s => s >= 60 && s < 75).length,
                    poor: data.scores.filter(s => s < 60).length,
                },
            };
        }).sort((a, b) => b.avgScore - a.avgScore);

        // Top and bottom 5 students
        const rankedStudents = results
            .map((r: any) => ({
                username: r.username,
                fullName: r.user?.fullName || r.username,
                className: r.user?.class?.name || '-',
                score: r.score,
                correctCount: r.correctCount,
                totalQuestions: r.totalQuestions
            }))
            .sort((a: any, b: any) => b.score - a.score);

        const topStudents = rankedStudents.slice(0, 5);
        const bottomStudents = rankedStudents.slice(-5).reverse();

        return {
            questions: questionStats,
            hasRealAnswers,
            summary: {
                packName: pack.name,
                totalQuestions: questions.length,
                totalStudents,
                avgScore: Math.round(avgScore),
                highestScore: Math.round(highestScore),
                lowestScore: Math.round(lowestScore),
                median: Math.round(median),
                stdDev: parseFloat(stdDev.toFixed(1)),
                passRate: parseFloat(passRate.toFixed(1)),
                distribution,
                avgCheatCount: parseFloat(avgCheatCount.toFixed(1)),
                perClass,
                topStudents,
                bottomStudents
            }
        };
    } catch (e: any) {
        throw new Error('Gagal memuat data analisis.');
    }
}

// --- Login Slides ---
export async function getLoginSlides() {
    await requireAdmin();
    try {
        return await prisma.loginSlide.findMany({ orderBy: { order: 'asc' } });
    } catch (e: any) {
        throw new Error('Gagal memuat data slide login.');
    }
}

export async function createLoginSlide(data: { title?: string; description?: string; imageUrl: string; order?: number; isActive?: boolean }) {
    await requireAdmin();
    try {
        await prisma.loginSlide.create({ data });
        return { success: true };
    } catch (e: any) {
        return { error: 'Gagal membuat slide login.' };
    }
}

export async function updateLoginSlide(data: { id: string; title?: string; description?: string; imageUrl?: string; order?: number; isActive?: boolean }) {
    await requireAdmin();
    try {
        const { id, ...rest } = data;
        await prisma.loginSlide.update({ where: { id }, data: rest });
        return { success: true };
    } catch (e: any) {
        return { error: 'Gagal mengupdate slide login.' };
    }
}

export async function deleteLoginSlide(id: string) {
    await requireAdmin();
    try {
        await prisma.loginSlide.delete({ where: { id } });
        return { success: true };
    } catch (e: any) {
        return { error: 'Gagal menghapus slide login.' };
    }
}
