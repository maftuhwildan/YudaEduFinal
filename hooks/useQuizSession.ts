'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SessionUser, Question, QuizPack } from '@/types';
import { getAvailablePacks, getQuizData, submitQuizResult } from '@/app/actions/exam';
import { updateSession, getUserPackSession } from '@/app/actions/monitoring';

// --- localStorage helpers for answer backup (survives refresh & network failures) ---
const LS_PREFIX = 'yudaedu_quiz_';
function backupAnswers(packId: string, answers: Record<string, string>) {
    try { localStorage.setItem(`${LS_PREFIX}answers_${packId}`, JSON.stringify(answers)); } catch { }
}
function restoreAnswers(packId: string): Record<string, string> | null {
    try {
        const raw = localStorage.getItem(`${LS_PREFIX}answers_${packId}`);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}
function clearBackup(packId: string) {
    try { localStorage.removeItem(`${LS_PREFIX}answers_${packId}`); } catch { }
}

type Stage = 'SELECT_PACK' | 'TOKEN' | 'QUIZ' | 'ERROR';

interface UseQuizSessionOptions {
    user: SessionUser;
    onFinish: (result: any) => void;
    onExpired: () => void;       // called when exam expired at entry
    onSessionKicked: () => void; // called when another device takes over the session
    setTimeLeft: (t: number) => void;
    enterFullscreen: () => void;
}

export function useQuizSession({
    user,
    onFinish,
    onExpired,
    onSessionKicked,
    setTimeLeft,
    enterFullscreen,
}: UseQuizSessionOptions) {
    const [stage, setStage] = useState<Stage>('SELECT_PACK');
    const [availablePacks, setAvailablePacks] = useState<QuizPack[]>([]);
    const [selectedPackId, setSelectedPackId] = useState('');
    const [tokenInput, setTokenInput] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [existingSession, setExistingSession] = useState<any>(null);

    const [questions, setQuestions] = useState<Question[]>([]);
    const [pack, setPack] = useState<QuizPack | null>(null);
    const [variant, setVariant] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [cheatCount, setCheatCount] = useState(0);

    const isSubmittingRef = useRef(false);
    const kickedRef = useRef(false);
    const [submitFailed, setSubmitFailed] = useState(false);
    const answersRef = useRef(answers);
    const currentIndexRef = useRef(currentIndex);
    const cheatCountRef = useRef(cheatCount);

    // Helper: detect session kicked from server error
    const handleSessionError = useCallback((e: any) => {
        const msg = e?.message || String(e);
        if (msg.includes('Unauthorized') && !kickedRef.current) {
            kickedRef.current = true;
            onSessionKicked();
        }
    }, [onSessionKicked]);

    // Keep refs in sync for heartbeat (avoids stale closures)
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);
    useEffect(() => { cheatCountRef.current = cheatCount; }, [cheatCount]);

    // --- Load available packs on mount ---
    const loadPacks = useCallback(async () => {
        const { packs, expiredCount } = await getAvailablePacks(user.id);

        if (expiredCount > 0 && packs.length === 0) {
            onExpired();
            return;
        }

        if (packs.length === 0) {
            setErrorMessage('No exams are currently active for your class.');
            setStage('ERROR');
        } else {
            setAvailablePacks(packs as any);
            if (packs.length === 1) {
                setSelectedPackId(packs[0].id);
                setStage('TOKEN');
            } else {
                setStage('SELECT_PACK');
            }
        }
    }, [user.id, onExpired]);

    useEffect(() => {
        enterFullscreen();
        loadPacks();
    }, [user]);  // eslint-disable-line react-hooks/exhaustive-deps

    // --- Check for existing session when entering TOKEN stage ---
    useEffect(() => {
        if (stage === 'TOKEN' && selectedPackId && user) {
            getUserPackSession(selectedPackId, user.id).then(session => {
                setExistingSession(session || null);
            });
        }
    }, [stage, selectedPackId, user]);

    // --- Pack selection ---
    const handlePackSelection = (id: string) => {
        enterFullscreen();
        setSelectedPackId(id);
        setStage('TOKEN');
        setErrorMessage('');
        setTokenInput('');
    };

    // --- Start / resume quiz ---
    const startQuiz = async () => {
        enterFullscreen();
        setErrorMessage('');

        const selectedPack = availablePacks.find(p => p.id === selectedPackId);
        if (selectedPack && selectedPack.token && selectedPack.token !== tokenInput) {
            setErrorMessage('Invalid Exam Token.');
            return;
        }

        try {
            // Always fetch session inline to avoid race condition where
            // user clicks "Start Exam" before the useEffect resolves existingSession.
            const freshSession = await getUserPackSession(selectedPackId, user.id);

            const { pack: p, questions: q } = await getQuizData(selectedPackId, user.id, tokenInput);

            setQuestions(q as any);
            setPack(p as any);
            setVariant('A');

            let initialAnswers: Record<string, string> = {};
            let initialIndex = 0;

            if (freshSession) {
                setExistingSession(freshSession); // sync state for UI
                initialAnswers = freshSession.answers
                    ? (typeof freshSession.answers === 'string'
                        ? JSON.parse(freshSession.answers)
                        : freshSession.answers)
                    : {};

                // Merge with localStorage backup — prefer whichever has more answers
                const lsBackup = restoreAnswers(p.id);
                if (lsBackup) {
                    const serverCount = Object.keys(initialAnswers).filter(k => !k.startsWith('_')).length;
                    const localCount = Object.keys(lsBackup).filter(k => !k.startsWith('_')).length;
                    if (localCount > serverCount) {
                        initialAnswers = { ...initialAnswers, ...lsBackup };
                    }
                }

                setAnswers(initialAnswers);
                initialIndex = freshSession.currentQuestionIndex || 0;
                setCurrentIndex(initialIndex);

                const now = Date.now();
                const start = Number(freshSession.startTime);
                const limitMs = p.timeLimit * 60 * 1000;
                const elapsed = now - start;
                const remaining = Math.max(0, Math.floor((limitMs - elapsed) / 1000));
                setTimeLeft(remaining);
            } else {
                setAnswers({});
                setTimeLeft(p.timeLimit * 60);
            }

            // Immediately create/update session in DB before showing quiz UI.
            // This ensures the student appears online right away, avoiding the
            // 3-second gap before the first heartbeat fires.
            await updateSession({
                userId: user.id,
                packId: p.id,
                packName: p.name,
                username: user.username,
                fullName: user.fullName || user.username,
                classId: user.classId,
                currentQuestionIndex: initialIndex,
                answeredCount: Object.keys(initialAnswers).length,
                totalQuestions: q.length,
                cheatCount: 0,
                variant: (q as any)[0]?.variant || 'A',
                answers: initialAnswers,
                questionOrder: (q as any).map((qq: any) => qq.id),
            });

            setStage('QUIZ');
        } catch (e: any) {
            const msg = e.message || '';
            if (
                msg.includes('Waktu ujian Anda telah habis') ||
                msg.includes('Anda sudah menyelesaikan ujian ini')
            ) {
                onExpired();
                return;
            }
            setErrorMessage(msg || 'Failed to load exam.');
        }
    };

    // --- Answer selection ---
    const handleSelect = (option: string) => {
        const newAnswers = { ...answers, [questions[currentIndex].id]: option };
        setAnswers(newAnswers);
        // Backup to localStorage so answers survive network failures / page refresh
        if (pack?.id) backupAnswers(pack.id, newAnswers);
        // The heartbeat will pick up the new answers and sync them to the server.
    };

    // --- Submission ---
    const executeSubmission = useCallback(async () => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setSubmitFailed(false);

        // Persist answers to localStorage before attempting submit
        if (pack?.id) backupAnswers(pack.id, answersRef.current);

        const MAX_RETRIES = 10;
        const BACKOFF_SCHEDULE = [1000, 2000, 3000, 5000, 5000, 10000, 10000, 15000, 15000, 30000];

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const resultData = {
                    userId: user.id,
                    packId: pack?.id,
                    cheatCount: cheatCountRef.current,
                    answers: answersRef.current,
                };

                const serverResult = await submitQuizResult(resultData);

                // Success — clear localStorage backup
                if (pack?.id) clearBackup(pack.id);

                onFinish({
                    id: 'temp',
                    userId: user.id,
                    username: user.username,
                    classId: user.classId,
                    score: serverResult.score ?? 0,
                    correctCount: serverResult.correctCount ?? 0,
                    totalQuestions: serverResult.totalQuestions ?? questions.length,
                    packName: pack?.name || '',
                    variant: variant || 'A',
                    timestamp: new Date().toISOString(),
                    cheatCount: cheatCountRef.current,
                });
                return; // Success, exit loop
            } catch (e) {
                if (attempt === MAX_RETRIES) {
                    // All retries exhausted — enable manual retry via UI
                    setSubmitFailed(true);
                    isSubmittingRef.current = false;
                } else {
                    // Wait before retrying (increasing backoff)
                    await new Promise(res => setTimeout(res, BACKOFF_SCHEDULE[attempt - 1] || 5000));
                }
            }
        }
    }, [questions, pack, variant, user, onFinish]);

    // --- Heartbeat sync (Safe Recursive Timeout) ---
    useEffect(() => {
        if (!pack || !user || stage !== 'QUIZ') return;

        let isRunning = true;
        let lastSyncedState = '';

        const syncSession = async () => {
            if (!isRunning) return;

            // Optional optimization: skip sync if nothing changed
            const currentState = JSON.stringify({
                idx: currentIndexRef.current,
                ansCount: Object.keys(answersRef.current).length,
                cheat: cheatCountRef.current
            });

            try {
                const fullPayload = {
                    userId: user.id,
                    packId: pack.id,
                    packName: pack.name,
                    username: user.username,
                    fullName: user.fullName || user.username,
                    classId: user.classId,
                    currentQuestionIndex: currentIndexRef.current,
                    answeredCount: Object.keys(answersRef.current).length,
                    totalQuestions: questions.length,
                    cheatCount: cheatCountRef.current,
                    variant: questions[0]?.variant || 'A',
                    answers: answersRef.current,
                    questionOrder: questions.map(q => q.id),
                };

                if (currentState !== lastSyncedState) {
                    // State changed — send full update
                    await updateSession(fullPayload);
                    lastSyncedState = currentState;
                } else {
                    // Nothing changed — send minimal heartbeat to stay "online"
                    const result = await updateSession({
                        userId: user.id,
                        packId: pack.id,
                        isHeartbeatOnly: true,
                    });
                    // If session was missing from DB (e.g. after DB restart), recreate it
                    if (result && (result as any).sessionMissing) {
                        await updateSession(fullPayload);
                        lastSyncedState = currentState;
                    }
                }
            } catch (e) {
                handleSessionError(e);
            }

            // Schedule next run only AFTER this one finishes (success or fail)
            if (isRunning) {
                setTimeout(syncSession, 3000);
            }
        };

        // Start the loop
        setTimeout(syncSession, 3000);

        return () => {
            isRunning = false;
        };
    }, [pack, user, stage, questions.length, handleSessionError]);

    return {
        // Stage & navigation
        stage,
        setStage,
        availablePacks,
        selectedPackId,
        handlePackSelection,
        // Token entry
        tokenInput,
        setTokenInput,
        errorMessage,
        existingSession,
        startQuiz,
        // Quiz state
        questions,
        pack,
        variant,
        currentIndex,
        setCurrentIndex,
        answers,
        handleSelect,
        cheatCount,
        setCheatCount,
        // Submission
        executeSubmission,
        submitFailed,
    };
}
