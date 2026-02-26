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

    const serverTime = Date.now();

    return sessions.map((s: any) => ({
        ...s,
        startTime: s.startTime.toString(),
        lastUpdate: s.lastUpdate.toString(),
        serverTime
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
    const { userId, packId, packName, username, fullName, classId, currentQuestionIndex, answeredCount, totalQuestions, cheatCount, variant, answers, isHeartbeatOnly, questionOrder } = data;

    const now = BigInt(Date.now());

    // Heartbeat-only: just bump lastUpdate if session exists
    if (isHeartbeatOnly) {
        const updated = await prisma.examSession.updateMany({
            where: { userId, packId, status: 'IN_PROGRESS' },
            data: { lastUpdate: now }
        });
        if (updated.count === 0) {
            // Session missing — signal client to send a full sync
            return { success: false, sessionMissing: true };
        }
        return { success: true };
    }

    // Full update: use upsert to avoid race condition on concurrent requests
    // (e.g. double-click or network retry hitting the server twice simultaneously)
    const initialAnswers: any = answers || {};
    if (questionOrder) {
        initialAnswers._questionOrder = questionOrder;
    }

    // Guard: only update answers in DB if the incoming payload actually has answer data.
    // This prevents an accidental empty `answers: {}` from overwriting existing answers.
    const incomingAnswerKeys = Object.keys(answers || {}).filter(k => !k.startsWith('_'));
    const shouldUpdateAnswers = incomingAnswerKeys.length > 0 || questionOrder;

    await prisma.examSession.upsert({
        where: { userId_packId: { userId, packId } },
        update: {
            currentQuestionIndex: currentQuestionIndex ?? 0,
            answeredCount: answeredCount ?? 0,
            lastUpdate: now,
            cheatCount: cheatCount ?? 0,
            answers: shouldUpdateAnswers ? initialAnswers : undefined,
        },
        create: {
            userId,
            packId,
            packName,
            username,
            fullName: fullName || username || 'Unknown',
            classId,
            variant: variant || 'A',
            startTime: now,
            lastUpdate: now,
            currentQuestionIndex: currentQuestionIndex || 0,
            answeredCount: answeredCount || 0,
            totalQuestions: totalQuestions || 0,
            cheatCount: cheatCount || 0,
            answers: initialAnswers,
        },
    });

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
        where: { packId: packMeta.id },
        select: { id: true, correctAnswer: true }
    });

    const savedAnswers = typeof session.answers === 'string'
        ? JSON.parse(session.answers)
        : (session.answers as Record<string, string>) || {};

    let correct = 0;
    questions.forEach((q: any) => {
        if (savedAnswers[q.id] === q.correctAnswer) correct++;
    });

    const totalQuestions = session.totalQuestions || questions.length;
    const finalScore = totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;

    // Atomic: flip IN_PROGRESS → COMPLETED only once, even if called concurrently
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return false;

    await prisma.$transaction(async (tx) => {
        const updated = await tx.examSession.updateMany({
            where: {
                userId: session.userId,
                packId: session.packId,
                status: 'IN_PROGRESS',
            },
            data: { status: 'COMPLETED', score: finalScore, endTime: new Date() },
        });

        // count === 0 means another concurrent call already completed it — skip
        if (updated.count === 0) return;

        await tx.result.create({
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
                answers: savedAnswers,
            },
        });

        await tx.user.update({
            where: { id: session.userId },
            data: { currentAttempts: { increment: 1 } },
        });
    });

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
