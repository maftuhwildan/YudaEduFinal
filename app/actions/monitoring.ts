'use server';

import { prisma } from '../lib/prisma';
import { cookies } from 'next/headers';
import { requireAdmin, requireAuth } from '@/lib/auth-guard';
import { logger } from '@/lib/logger';

export async function getExamSessions(packId: string) {
    await requireAdmin();
    // Return only IN_PROGRESS sessions for live monitoring
    const sessions = await prisma.examSession.findMany({
        where: {
            packId,
            status: 'IN_PROGRESS' // Only show active sessions, not completed ones
        },
        orderBy: { lastUpdate: 'desc' }
    });

    return sessions.map((s: any) => ({
        ...s,
        startTime: s.startTime.toString(),
        lastUpdate: s.lastUpdate.toString()
    }));
}

export async function getActiveSessionCounts() {
    await requireAdmin();
    const sessions = await prisma.examSession.findMany({
        where: { status: 'IN_PROGRESS' },
        select: { packId: true }
    });
    const counts: Record<string, number> = {};
    for (const s of sessions) {
        counts[s.packId] = (counts[s.packId] || 0) + 1;
    }
    return counts;
}

export async function updateSession(data: any) {
    const caller = await requireAuth();
    // Ownership: only allow updating your own session
    if (caller.id !== data.userId && caller.role !== 'ADMIN') throw new Error('Forbidden');
    const { userId, packId, packName, username, fullName, classId, currentQuestionIndex, answeredCount, totalQuestions, cheatCount, variant, answers } = data;

    // Check if session exists
    const existing = await prisma.examSession.findUnique({
        where: { userId_packId: { userId, packId } }
    });

    const now = BigInt(Date.now());

    if (existing) {
        await prisma.examSession.update({
            where: { userId_packId: { userId, packId } },
            data: {
                currentQuestionIndex,
                answeredCount,
                lastUpdate: now,
                cheatCount,
                answers: answers || existing.answers
            }
        });
    } else {
        await prisma.examSession.create({
            data: {
                userId,
                packId,
                packName,
                username,
                fullName: fullName || username || 'Unknown', // Fallback
                classId,
                variant: variant || 'A',
                startTime: now,
                lastUpdate: now,
                currentQuestionIndex,
                answeredCount,
                totalQuestions,
                cheatCount,
                answers: answers || {}
            }
        });
    }
    return { success: true };
}

// --- Lazy Expiration Helper (WARN-3: optimized 2-phase check) ---
// Phase 1: check time with lightweight query (no questions loaded).
// Phase 2: only load questions if session actually expired (for scoring).
export async function expireSessionIfOverdue(session: any): Promise<boolean> {
    if (session.status !== 'IN_PROGRESS') return false;

    // Phase 1: lightweight time check — only need timeLimit
    const packMeta = await prisma.quizPack.findUnique({
        where: { id: session.packId },
        select: { id: true, timeLimit: true }
    });
    if (!packMeta) return false;

    const now = Date.now();
    const start = Number(session.startTime);
    const limitMs = packMeta.timeLimit * 60 * 1000;

    if ((now - start) < limitMs) return false; // Still within time — no questions loaded

    // Phase 2: Time exceeded — now load questions for scoring
    const questions = await prisma.question.findMany({
        where: { packId: packMeta.id }
    });

    let correct = 0;
    const savedAnswers = typeof session.answers === 'string'
        ? JSON.parse(session.answers)
        : (session.answers as Record<string, string>) || {};

    questions.forEach((q: any) => {
        if (savedAnswers[q.id] === q.correctAnswer) correct++;
    });

    const totalQuestions = session.totalQuestions || questions.length;
    const finalScore = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;

    // Mark session as COMPLETED (preserve original answers)
    await prisma.examSession.update({
        where: { userId_packId: { userId: session.userId, packId: session.packId } },
        data: {
            status: 'COMPLETED',
            score: finalScore,
            endTime: new Date()
        }
    });

    // Save result
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (user) {
        await prisma.result.create({
            data: {
                userId: session.userId,
                username: user.username,
                classId: user.classId,
                score: finalScore,
                correctCount: correct,
                totalQuestions,
                packName: session.packName || 'Unknown Exam',
                variant: session.variant || 'A',
                cheatCount: session.cheatCount,
                answers: savedAnswers
            }
        });

        await prisma.user.update({
            where: { id: session.userId },
            data: { currentAttempts: { increment: 1 } }
        });
    }

    return true;
}

// Get session status per userId for a specific pack (lightweight for Results tab retake status)
export async function getPackSessionStatus(packId: string): Promise<{ inProgress: string[], completed: string[] }> {
    await requireAdmin();
    const sessions = await prisma.examSession.findMany({
        where: { packId },
        select: { userId: true, status: true }
    });
    const inProgress: string[] = [];
    const completed: string[] = [];
    for (const s of sessions) {
        if (s.status === 'IN_PROGRESS') inProgress.push(s.userId);
        else if (s.status === 'COMPLETED') completed.push(s.userId);
    }
    return { inProgress, completed };
}

export async function getUserPackSession(packId: string, userId: string) {
    const caller = await requireAuth();
    if (caller.id !== userId && caller.role !== 'ADMIN') throw new Error('Forbidden');
    const session = await prisma.examSession.findUnique({
        where: { userId_packId: { userId, packId } }
    });

    if (!session) return null;

    // Skip completed sessions
    if (session.status === 'COMPLETED') return null;

    // Lazy expiration: auto-submit if time has exceeded
    const wasExpired = await expireSessionIfOverdue(session);
    if (wasExpired) return null; // Session expired and auto-submitted

    return {
        ...session,
        startTime: session.startTime.toString(),
        lastUpdate: session.lastUpdate.toString()
    };
}
