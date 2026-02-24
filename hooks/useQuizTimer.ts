'use client';

import { useState, useEffect, useRef } from 'react';

interface UseQuizTimerOptions {
    active: boolean;          // Whether the timer should be running (stage === 'QUIZ')
    onExpire: () => void;     // Callback when the timer hits 0
}

export function useQuizTimer({ active, onExpire }: UseQuizTimerOptions) {
    const [timeLeft, setTimeLeft] = useState(0);
    const expiredRef = useRef(false);
    const onExpireRef = useRef(onExpire);
    // Guard: only allow expiration after timeLeft has been set to > 0 at least once.
    // This prevents the default value of 0 from triggering auto-submit on initial render.
    const hasBeenSetRef = useRef(false);

    // Keep ref current without re-triggering effects
    useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

    // Reset guards when a new quiz session starts (active flips false → true)
    useEffect(() => {
        if (active) {
            expiredRef.current = false;
            hasBeenSetRef.current = false;
        }
    }, [active]);

    // Track when timeLeft has genuinely been set (> 0)
    useEffect(() => {
        if (timeLeft > 0) hasBeenSetRef.current = true;
    }, [timeLeft]);

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

    // Trigger auto-submit exactly once when time reaches 0
    // Only if timer has been genuinely loaded (hasBeenSetRef prevents premature fire)
    useEffect(() => {
        if (active && timeLeft === 0 && !expiredRef.current && hasBeenSetRef.current) {
            expiredRef.current = true;
            onExpireRef.current();
        }
    }, [timeLeft, active]);

    return { timeLeft, setTimeLeft };
}
