'use client';

import { useState, useCallback } from 'react';

// iOS detection — fullscreen API is not supported on iPhone/iPad
const getIsIOS = () =>
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

export function useFullscreen() {
    const isIOS = getIsIOS();
    const [isFullscreen, setIsFullscreen] = useState(true);

    const enterFullscreen = useCallback(() => {
        // iOS does not support Fullscreen API — treat as always fullscreen
        if (isIOS) {
            setIsFullscreen(true);
            return;
        }

        const elem = document.documentElement as any;
        if (document.fullscreenElement) return;

        const requestFs =
            elem.requestFullscreen ||
            elem.webkitRequestFullscreen ||
            elem.msRequestFullscreen;

        if (requestFs) {
            // Note: navigationUI hint prevents some Android devices from locking to landscape automatically.
            const p = requestFs.call(elem, elem.requestFullscreen ? { navigationUI: 'hide' } : undefined);
            if (p && p.then) {
                p.then(() => {
                    setIsFullscreen(true);
                    try {
                        // Explicitly tell the browser allowing natural orientation
                        if (window.screen && window.screen.orientation && window.screen.orientation.unlock) {
                            window.screen.orientation.unlock();
                        }
                    } catch (e) { }
                }).catch(() => {
                    setIsFullscreen(true);
                });
            } else {
                setIsFullscreen(true);
            }
        } else {
            setIsFullscreen(true);
        }
    }, [isIOS]);

    const handleFullscreenChange = useCallback(() => {
        if (isIOS) return;
        if (!document.fullscreenElement) {
            setIsFullscreen(false);
        } else {
            setIsFullscreen(true);
        }
    }, [isIOS]);

    return { isFullscreen, setIsFullscreen, enterFullscreen, handleFullscreenChange, isIOS };
}
