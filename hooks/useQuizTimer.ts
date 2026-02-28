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

    // Keep ref current without re-triggering effects
    useEffect(() => { onExpireRef.current = onExpire; }, [onExpire]);

    // Reset guards when a new quiz session starts (active flips false → true)
    useEffect(() => {
        if (active) {
            expiredRef.current = false;
        }
    }, [active]);

    // Countdown interval (The only source of truth for expiration)
    useEffect(() => {
        if (!active) return;

        const timer = setInterval(() => {
            setTimeLeft(prev => {
                // If it's already 0 or less, do nothing to prevent negative time
                if (prev <= 0) {
                    clearInterval(timer);
                    return 0;
                }

                const nextTime = prev - 1;

                // Fire expiration EXACTLY as the tick hits 0 from a positive number
                if (nextTime === 0 && !expiredRef.current) {
                    clearInterval(timer);
                    expiredRef.current = true;
                    // Escape React's state transition phase to avoid 
                    // "Cannot update a component while rendering a different component" warnings
                    setTimeout(() => onExpireRef.current(), 0);
                }

                return nextTime;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [active]);

    return { timeLeft, setTimeLeft };
}
