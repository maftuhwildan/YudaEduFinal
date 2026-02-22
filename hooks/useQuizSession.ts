'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { SessionUser, Question, QuizPack } from '@/types';
import { getAvailablePacks, getQuizData, submitQuizResult } from '@/app/actions/exam';
import { updateSession, getUserPackSession } from '@/app/actions/monitoring';

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

            if (freshSession) {
                setExistingSession(freshSession); // sync state for UI
                setAnswers(
                    freshSession.answers
                        ? (typeof freshSession.answers === 'string'
                            ? JSON.parse(freshSession.answers)
                            : freshSession.answers)
                        : {}
                );
                setCurrentIndex(freshSession.currentQuestionIndex || 0);

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

        if (pack && user) {
            updateSession({
                userId: user.id,
                packId: pack.id,
                packName: pack.name,
                username: user.username,
                fullName: user.fullName || user.username,
                classId: user.classId,
                currentQuestionIndex: currentIndex,
                answeredCount: Object.keys(newAnswers).length,
                totalQuestions: questions.length,
                cheatCount,
                variant: questions[0]?.variant || 'A',
                answers: newAnswers,
            }).catch(handleSessionError);
        }
    };

    // --- Submission ---
    const executeSubmission = useCallback(async () => {
        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        try {
            const resultData = {
                userId: user.id,
                packId: pack?.id,
                cheatCount: cheatCountRef.current,
                answers: answersRef.current,
            };

            const serverResult = await submitQuizResult(resultData);

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
        } catch (e) {
            alert('Submission failed. Check connection.');
            isSubmittingRef.current = false;
        }
    }, [questions, pack, variant, user, onFinish]);

    // --- Heartbeat sync ---
    useEffect(() => {
        if (!pack || !user || stage !== 'QUIZ') return;

        const syncSession = () => {
            updateSession({
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
            }).catch(handleSessionError);
        };

        const interval = setInterval(syncSession, 3000);
        return () => {
            clearInterval(interval);
        };
    }, [pack, user, stage, questions.length]);

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
    };
}
