'use client';

import { useState, useEffect } from 'react';

interface UseQuizTimerOptions {
    active: boolean;          // Whether the timer should be running (stage === 'QUIZ')
    onExpire: () => void;     // Callback when the timer hits 0
}

export function useQuizTimer({ active, onExpire }: UseQuizTimerOptions) {
    const [timeLeft, setTimeLeft] = useState(0);

    // Countdown interval
    useEffect(() => {
        if (!active) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [active]);

    // Trigger auto-submit when time expires
    useEffect(() => {
        if (active && timeLeft === 0) {
            onExpire();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeLeft, active]);

    return { timeLeft, setTimeLeft };
}
