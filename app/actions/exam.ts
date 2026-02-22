'use server';

import { prisma } from '../lib/prisma';
import { Role } from '@/types';
import { cookies } from 'next/headers';
import { expireSessionIfOverdue } from './monitoring';
import { getSession } from './auth';
import { logger } from '@/lib/logger';

export async function getAvailablePacks(userId: string) {
    // Auth guard: validate session and ownership
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');
    if (session.id !== userId && session.role !== 'ADMIN') throw new Error('Forbidden');

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return { packs: [], expiredCount: 0 };

    const packs = await prisma.quizPack.findMany({ where: { isActive: true } });
    if (user.role === Role.ADMIN) return { packs, expiredCount: 0 };

    // Lazy expiration: auto-complete any IN_PROGRESS sessions that have exceeded time
    let expiredCount = 0;
    const inProgressSessions = await prisma.examSession.findMany({
        where: { userId: user.id, status: 'IN_PROGRESS' }
    });
    for (const session of inProgressSessions) {
        const wasExpired = await expireSessionIfOverdue(session);
        if (wasExpired) expiredCount++;
    }

    // Now fetch all completed sessions (including freshly expired ones)
    const completedSessions = await prisma.examSession.findMany({
        where: {
            userId: user.id,
            status: 'COMPLETED'
        },
        select: { packId: true }
    });
    const completedPackIds = new Set(completedSessions.map((s: any) => s.packId));

    const availablePacks = packs.filter((p: any) => {
        if (completedPackIds.has(p.id)) return false;

        let allowed: string[] = [];
        if (Array.isArray(p.allowedClassIds)) {
            allowed = p.allowedClassIds as string[];
        } else if (typeof p.allowedClassIds === 'string') {
            try { allowed = JSON.parse(p.allowedClassIds); } catch (e) { }
        }

        if (allowed.length === 0) return true;
        return user.classId && allowed.includes(user.classId);
    });

    return { packs: availablePacks, expiredCount };
}

export async function getQuizData(packId: string, userId: string, token?: string) {
    // Auth guard: validate session and ownership
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');
    if (session.id !== userId && session.role !== 'ADMIN') throw new Error('Forbidden');

    const pack = await prisma.quizPack.findUnique({
        where: { id: packId },
        include: { questions: true }
    });

    if (!pack) throw new Error('Pack not found');
    if (!pack.isActive) throw new Error('Exam is closed');

    // --- Lazy Expiration Guard ---
    // Check for a stale IN_PROGRESS session that should have been expired
    const existingSession = await prisma.examSession.findUnique({
        where: { userId_packId: { userId, packId } }
    });

    if (existingSession && existingSession.status === 'IN_PROGRESS') {
        const wasExpired = await expireSessionIfOverdue(existingSession);
        if (wasExpired) {
            throw new Error('Waktu ujian Anda telah habis saat offline. Ujian telah otomatis dikumpulkan.');
        }
    }

    // Server-side token validation — always required
    if (pack.token && pack.token !== token) {
        throw new Error('Invalid Exam Token.');
    }

    let questions = pack.questions;

    const variants = Array.from(new Set(questions.map((q: any) => q.variant).filter(Boolean)));
    if (variants.length > 1) {
        // Distribute variants evenly based on userId hash
        let hash = 0;
        for (let i = 0; i < userId.length; i++) {
            hash = ((hash << 5) - hash) + userId.charCodeAt(i);
            hash = hash & hash; // Convert to 32bit integer
        }
        const selectedVariant = variants[Math.abs(hash) % variants.length];
        questions = questions.filter((q: any) => q.variant === selectedVariant);
    } else if (variants.length === 1) {
        questions = questions.filter((q: any) => q.variant === variants[0]);
    }

    if (pack.randomizeQuestions) {
        questions = questions.sort(() => Math.random() - 0.5);
    }

    const safeQuestions = questions.map((q: any) => {
        let opts: string[] = [];
        if (Array.isArray(q.options)) {
            opts = q.options as string[];
        } else if (typeof q.options === 'string') {
            try { opts = JSON.parse(q.options); } catch (e) { opts = []; }
        }

        if (pack.randomizeOptions) {
            opts = opts.sort(() => Math.random() - 0.5);
        }
        return { id: q.id, text: q.text, stimulus: q.stimulus, imageUrl: q.imageUrl, options: opts, variant: q.variant };
    });

    // Strip questions from pack to avoid leaking correctAnswer
    const { questions: _stripped, ...safePack } = pack;
    return { pack: safePack, questions: safeQuestions };
}

export async function submitQuizResult(resultData: any) {
    // HIGH-2: Use authenticated user instead of client-sent userId
    const session = await (await import('./auth')).getSession();
    if (!session) throw new Error('Unauthorized');
    const userId = session.id;

    const { packId, cheatCount, answers } = resultData;

    try {
        // 1. Find user for username & classId (needed for Result table)
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) throw new Error("User not found");

        // HIGH-1: Server-side scoring — never trust client score
        const packQuestions = await prisma.question.findMany({ where: { packId } });
        const totalQuestions = packQuestions.length;
        let correctCount = 0;
        for (const q of packQuestions) {
            if (answers && answers[q.id] === q.correctAnswer) correctCount++;
        }
        const score = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;

        // 2. Find active session
        const session = await prisma.examSession.findUnique({
            where: { userId_packId: { userId, packId } }
        });

        if (session) {
            // Guard: prevent double submission
            if (session.status === 'COMPLETED') {
                return { success: true, message: 'Already completed' };
            }

            // Update session status to COMPLETED
            await prisma.examSession.update({
                where: { userId_packId: { userId, packId } },
                data: {
                    status: 'COMPLETED',
                    score: score,
                    endTime: new Date(),
                    cheatCount: cheatCount
                }
            });

            // 3. Also save to Result table for Admin Dashboard
            await prisma.result.create({
                data: {
                    userId: userId,
                    username: user.username,
                    classId: user.classId,
                    score: score,
                    correctCount: correctCount,
                    totalQuestions: totalQuestions,
                    packName: session.packName || 'Unknown Exam',
                    variant: session.variant || 'A',
                    cheatCount: cheatCount,
                    answers: answers || {}
                }
            });

        } else {
            throw new Error("Active exam session not found.");
        }

        // Update jumlah percobaan user
        await prisma.user.update({
            where: { id: userId },
            data: { currentAttempts: { increment: 1 } }
        });

        return { success: true, score, correctCount, totalQuestions };
    } catch (error: any) {
        logger.error("Submit Error:", error);
        return { success: false, error: error.message };
    }
}

export async function getStudentExamsStatus(userId: string) {
    // Auth guard: validate session and ownership
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');
    if (session.id !== userId && session.role !== 'ADMIN') throw new Error('Forbidden');

    const sessions = await prisma.examSession.findMany({
        where: { userId },
        select: { packId: true, status: true, score: true }
    });
    return sessions;
}

// AI Generation
export async function generateQuizQuestions(topic: string, count: number = 5, variant: string = 'A') {
    if (!process.env.GROQ_API_KEY) throw new Error("API Key missing");

    const apiKey = process.env.GROQ_API_KEY;

    const prompt = `You are an expert exam question creator for Indonesian high school (SMA) students.

Create exactly ${count} multiple choice questions about "${topic}".
Each question must have exactly 5 answer options.

IMPORTANT RULES:

1. ANSWER OPTIONS:
   - All 5 options must be plausible and similar in length/format.
   - Avoid obviously wrong "joke" answers.
   - The correct answer must be unambiguously correct.
   - Distractors should represent common misconceptions or partial understanding.

2. COGNITIVE LEVELS - Vary the difficulty:
   - Some questions should test recall/knowledge (C1-C2)
   - Some should test understanding/application (C3-C4)
   - Some should test analysis/evaluation (C5-C6)

3. LANGUAGE: Write all questions in Bahasa Indonesia.

Return ONLY a valid JSON array with this exact structure:
[{"text": "Question text?", "options": ["Option A", "Option B", "Option C", "Option D", "Option E"], "correctAnswer": "The exact text of the correct option"}]`;

    try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    {
                        role: "system",
                        content: "You are a professional exam question writer. You output ONLY valid JSON arrays. No markdown, no explanation, no code fences. Just the JSON array."
                    },
                    { role: "user", content: prompt }
                ],
                temperature: 0.5
            })
        });

        const json = await response.json();
        const content = json.choices[0]?.message?.content;

        // Extract JSON using multiline regex workaround or simple match
        const match = content.match(/\[[\s\S]*\]/);
        if (match) {
            return JSON.parse(match[0]).map((q: any) => ({
                text: q.text,
                options: q.options,
                correctAnswer: q.correctAnswer,
                stimulus: null,
                variant: variant
            }));
        }
        throw new Error("Failed to parse AI response");
    } catch (e) {
        logger.error("AI Gen Error", e);
        // Fallback Mock for demo if API fails
        return Array(count).fill(0).map((_, i) => ({
            text: `Mock Question ${i + 1} about ${topic}`,
            options: ["Option A", "Option B", "Option C", "Option D", "Option E"],
            correctAnswer: "Option A",
            variant: variant
        }));
    }
}
