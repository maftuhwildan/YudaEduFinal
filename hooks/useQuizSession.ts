'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SessionUser, Question, QuizPack } from '@/types';
import { getAvailablePacks, getQuizData, submitQuizResult } from '@/app/actions/exam';
import { updateSession, getUserPackSession } from '@/app/actions/monitoring';
import { useQuizTimer } from './useQuizTimer';

// --- localStorage helpers for answer backup (survives refresh & network failures) ---
const LS_PREFIX = 'yudaedu_quiz_';
function backupAnswers(packId: string, answers: Record<string, string>) {
    // Save answers with a timestamp so we know EXACTLY when each was picked
    try {
        const payload: Record<string, { val: string, ts: number }> = {};
        const now = Date.now();
        for (const [qId, val] of Object.entries(answers)) {
            // We don't have individual timestamps in state, but saving the backup 
            // happens immediately on click, so `now` is accurate enough.
            payload[qId] = { val, ts: now };
        }
        localStorage.setItem(`${LS_PREFIX}answers_${packId}`, JSON.stringify(payload));
    } catch { }
}
function restoreAnswers(packId: string): Record<string, { val: string, ts: number }> | null {
    try {
        const raw = localStorage.getItem(`${LS_PREFIX}answers_${packId}`);
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}
function clearBackup(packId: string) {
    try { localStorage.removeItem(`${LS_PREFIX}answers_${packId}`); } catch { }
}

type Stage = 'SELECT_PACK' | 'TOKEN' | 'QUIZ' | 'ERROR' | 'EXPIRED';

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
    const [isCheckingSession, setIsCheckingSession] = useState(false);

    const [questions, setQuestions] = useState<Question[]>([]);
    const [pack, setPack] = useState<QuizPack | null>(null);
    const [variant, setVariant] = useState('');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [cheatCount, setCheatCount] = useState(0);

    const isSubmittingRef = useRef(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const kickedRef = useRef(false);
    const [submitFailed, setSubmitFailed] = useState(false);
    const [submitRetryCount, setSubmitRetryCount] = useState(0);

    // Refs for live state (crucial for timeout auto-submit)
    const answersRef = useRef(answers);
    const cheatCountRef = useRef(cheatCount);
    const currentIndexRef = useRef(currentIndex);

    // Keep refs in sync for heartbeat (avoids stale closures)
    useEffect(() => { answersRef.current = answers; }, [answers]);
    useEffect(() => { cheatCountRef.current = cheatCount; }, [cheatCount]);
    useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

    // Forward declare executeSubmission so it can be used in onExpire
    const executeSubmissionRef = useRef<((isRetry?: boolean) => Promise<void>) | null>(null);

    useQuizTimer({
        active: stage === 'QUIZ',
        onExpire: () => {
            // FIRE ALARM: Time is up! 
            // We forcefully submit the LIVE React state right now,
            // bypassing the stale 15-second heartbeat cache to prevent data loss.
            if (executeSubmissionRef.current) {
                executeSubmissionRef.current();
            } else {
                setStage('EXPIRED');
            }
        },
    });

    // Helper: detect session kicked from server error
    const handleSessionError = useCallback((e: any) => {
        const msg = e?.message || String(e);
        if (msg.includes('Unauthorized') && !kickedRef.current) {
            kickedRef.current = true;
            onSessionKicked();
        }
    }, [onSessionKicked]);

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
            setIsCheckingSession(true);
            getUserPackSession(selectedPackId, user.id)
                .then(session => {
                    setExistingSession(session || null);
                })
                .finally(() => {
                    setIsCheckingSession(false);
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

                // Merge with localStorage backup — TIMESTAMP BASED (The Ultimate Source of Truth)
                const lsBackup = restoreAnswers(p.id);
                if (lsBackup) {
                    // We assume server data `freshSession.lastUpdate` is the baseline timestamp 
                    // for all answers currently in the server.
                    // If a specific answer in localStorage has a timestamp NEWER than the server's
                    // last heartbeat, it means the user clicked it AFTER the last sync but before crashing.
                    const serverTs = Number(freshSession.lastUpdate) || 0;

                    for (const [qId, localData] of Object.entries(lsBackup)) {
                        if (qId.startsWith('_')) continue;

                        // Case 1: Server doesn't have this answer at all
                        // Case 2: Server has it, but local backup is strictly NEWER than the last heartbeat
                        if (!initialAnswers[qId] || localData.ts > serverTs) {
                            initialAnswers[qId] = localData.val;
                        }
                    }
                }

                setAnswers(initialAnswers);
                initialIndex = freshSession.currentQuestionIndex || 0;
                setCurrentIndex(initialIndex);

                // FIXED TIME DESYNC: Use Server Time as the Absolute Truth for elapsed calculation
                const now = freshSession.serverTime || Date.now();
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
                answeredCount: Object.keys(initialAnswers).filter(k => !k.startsWith('_')).length,
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

    // --- Cross-Tab Sync (Ghost Tab Prevention) ---
    useEffect(() => {
        if (!pack?.id || stage !== 'QUIZ') return;

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === `${LS_PREFIX}answers_${pack.id}`) {
                try {
                    const latestAnswers = JSON.parse(e.newValue || '{}');
                    setAnswers(latestAnswers);
                } catch (err) {
                    console.error('Failed to sync answers across tabs', err);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [pack?.id, stage]);

    // --- Submission ---
    const executeSubmission = useCallback(async (isRetry = false) => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);

        if (!isRetry) {
            setSubmitFailed(false);
            setSubmitRetryCount(0);
        }

        // Persist answers to localStorage before attempting submit
        if (pack?.id) backupAnswers(pack.id, answersRef.current);

        const MAX_RETRIES = 10;
        const BACKOFF_SCHEDULE = [1000, 2000, 3000, 5000, 5000, 10000, 10000, 15000, 15000, 30000];

        try {
            const resultData = {
                userId: user.id,
                packId: pack?.id,
                cheatCount: cheatCountRef.current,
                answers: answersRef.current,
            };

            const serverResult = await submitQuizResult(resultData);

            if (!serverResult.success) {
                throw new Error(serverResult.error || 'Submission failed on server');
            }

            // Success — clear backup & reset UI
            if (pack?.id) clearBackup(pack.id);
            setSubmitFailed(false);

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
            // Don't flip isSubmittingRef to false here because the component unmounts! 
            // If we did, a double click during unmount could fire another API call.
        } catch (e: any) {
            console.error("Submission failed:", e);

            // Check if we ran out of retries
            setSubmitRetryCount(prev => {
                const nextCount = prev + 1;

                if (nextCount > MAX_RETRIES) {
                    setSubmitFailed(true);
                    isSubmittingRef.current = false; // 🔓 SAFE UNLOCK FOR MANUAL RETRY
                    setIsSubmitting(false);
                    return prev;
                }

                // 🔄 Schedule background REST-ful retry 
                // We unlock the ref SOON right before the next execution fires
                const delay = BACKOFF_SCHEDULE[prev] || 5000;
                setTimeout(() => {
                    isSubmittingRef.current = false; // Unlock for the recursive call
                    executeSubmission(true);
                }, delay);

                return nextCount;
            });
            // We intentionally do NOT `finally { isSubmittingRef.current = false }` yet,
            // because the `setTimeout` owns the lock until it triggers. 
            // This prevents duplicate spam clicks while waiting for the delay.
        }
    }, [questions, pack, variant, user, onFinish, submitRetryCount]);

    // Wire up the ref for the timer's onExpire callback
    useEffect(() => {
        executeSubmissionRef.current = executeSubmission;
    }, [executeSubmission]);

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

            // Helper to prevent hanging Promises on bad networks
            const withTimeout = <T>(promise: Promise<T>, ms = 10000) => {
                return Promise.race([
                    promise,
                    new Promise<never>((_, reject) =>
                        setTimeout(() => reject(new Error('Network Timeout')), ms)
                    )
                ]);
            };

            try {
                const fullPayload = {
                    userId: user.id,
                    packId: pack.id,
                    packName: pack.name,
                    username: user.username,
                    fullName: user.fullName || user.username,
                    classId: user.classId,
                    currentQuestionIndex: currentIndexRef.current,
                    answeredCount: Object.keys(answersRef.current).filter(k => !k.startsWith('_')).length,
                    totalQuestions: questions.length,
                    cheatCount: cheatCountRef.current,
                    variant: questions[0]?.variant || 'A',
                    answers: answersRef.current,
                    questionOrder: questions.map(q => q.id),
                };

                if (currentState !== lastSyncedState) {
                    // State changed — send full update with 10s fuse
                    await withTimeout(updateSession(fullPayload));
                    lastSyncedState = currentState;
                } else {
                    // Nothing changed — send minimal heartbeat with 10s fuse
                    const result = await withTimeout(updateSession({
                        userId: user.id,
                        packId: pack.id,
                        isHeartbeatOnly: true,
                    }));
                    // If session was missing from DB (e.g. after DB restart), recreate it
                    if (result && (result as any).sessionMissing) {
                        await withTimeout(updateSession(fullPayload));
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

        // --- Adrenaline Shot (Anti Browser Throttling) ---
        // Instantly force a heartbeat the moment the student alt-tabs back to the exam.
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isRunning) {
                syncSession();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Start the loop
        setTimeout(syncSession, 3000);

        return () => {
            isRunning = false;
            document.removeEventListener('visibilitychange', handleVisibilityChange);
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
        isSubmitting,
        submitFailed,
        submitRetryCount,
        isCheckingSession,
    };
}
