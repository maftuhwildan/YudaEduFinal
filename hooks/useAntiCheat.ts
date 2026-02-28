'use client';

import { useEffect, useCallback, useRef } from 'react';

interface UseAntiCheatOptions {
    active: boolean;                  // Only activate when stage === 'QUIZ'
    isFullscreen: boolean;
    showCheatWarning: boolean;
    onCheat: (msg: string, increment: boolean) => void;   // trigger warning UI
    onFullscreenChange: () => void;   // delegate to useFullscreen handler
}

export function useAntiCheat({
    active,
    isFullscreen,
    showCheatWarning,
    onCheat,
    onFullscreenChange,
}: UseAntiCheatOptions) {
    const lastWarningTime = useRef<number>(0);

    const triggerWarning = useCallback(
        (msg: string, incrementCount: boolean) => {
            const now = Date.now();
            // Cooldown 1.5 detik: Cegah event blur & visibilitychange menumpuk barengan saat ALT+TAB
            if (now - lastWarningTime.current < 1500) return;

            lastWarningTime.current = now;
            onCheat(msg, incrementCount);
        },
        [onCheat]
    );

    useEffect(() => {
        if (!active) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                triggerWarning('Terdeteksi berpindah tab! Sistem telah mencatat tindakan ini.', true);
            }
        };

        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            triggerWarning('Klik kanan dinonaktifkan.', false);
        };

        const handleCopyPaste = (e: ClipboardEvent) => {
            e.preventDefault();
            triggerWarning('Salin/Tempel dinonaktifkan.', false);
        };

        const handleBlur = () => {
            if (!showCheatWarning) {
                triggerWarning('Fokus hilang! Harap tetap di layar ujian.', true);
            }
        };

        document.addEventListener('fullscreenchange', onFullscreenChange);
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('contextmenu', handleContextMenu);
        document.addEventListener('copy', handleCopyPaste);
        document.addEventListener('cut', handleCopyPaste);
        document.addEventListener('paste', handleCopyPaste);

        return () => {
            document.removeEventListener('fullscreenchange', onFullscreenChange);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('contextmenu', handleContextMenu);
            document.removeEventListener('copy', handleCopyPaste);
            document.removeEventListener('cut', handleCopyPaste);
            document.removeEventListener('paste', handleCopyPaste);
        };
    }, [active, isFullscreen, showCheatWarning, onFullscreenChange, triggerWarning]);
}
