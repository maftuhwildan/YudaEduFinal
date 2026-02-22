'use client';

import { useEffect } from 'react';

/**
 * useTableAutoScale — Auto-zooms tables that overflow their container.
 *
 * Uses CSS `zoom` instead of `transform: scale()`.
 * KEY DIFFERENCE: `zoom` changes BOTH visual size AND layout box.
 * `transform: scale()` only changes visual — layout box stays at natural
 * width, causing either scrollbar (no clip) or right-edge clipping (with clip).
 *
 * Architecture:
 *  - Each scalable area wrapped in `.quiz-scale-area` (overflow:hidden as safety net).
 *  - Natural table width measured via OFF-SCREEN CLONE (bypasses all constraints).
 *  - Available width = quiz-scale-area.clientWidth.
 *  - CSS zoom applied to .quiz-table-wrapper — layout box shrinks to match visual.
 *  - NO sizer div needed — zoom handles layout automatically.
 *  - ResizeObserver + MutationObserver for reactive re-scaling.
 */
export function useTableAutoScale(
    containerRef: React.RefObject<HTMLDivElement | null>,
    trigger: unknown
) {
    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;

        let isScaling = false;

        const scale = () => {
            if (isScaling) return;
            isScaling = true;

            try {
                const wrappers = root.querySelectorAll<HTMLElement>('.quiz-table-wrapper');
                if (!wrappers.length) { isScaling = false; return; }

                // Phase 1: Reset zoom on all wrappers
                wrappers.forEach(w => {
                    (w.style as any).zoom = '';
                });
                void root.offsetHeight; // force reflow

                // Phase 2: Measure natural width and apply zoom
                wrappers.forEach(wrapper => {
                    const table = wrapper.querySelector<HTMLTableElement>('table');
                    if (!table) return;

                    // Natural width via off-screen clone
                    const clone = table.cloneNode(true) as HTMLTableElement;
                    clone.style.cssText =
                        'position:fixed;top:-9999px;left:-9999px;' +
                        'visibility:hidden;display:table;' +
                        'width:auto;max-width:none;border-collapse:collapse;';
                    clone.querySelectorAll<HTMLElement>('td,th').forEach(cell => {
                        cell.style.whiteSpace = 'nowrap';
                    });
                    document.body.appendChild(clone);
                    const naturalW = clone.getBoundingClientRect().width;
                    document.body.removeChild(clone);
                    if (!naturalW) return;

                    const area = wrapper.closest<HTMLElement>('.quiz-scale-area');
                    if (!area) return;
                    const availableW = area.clientWidth;
                    if (!availableW || naturalW <= availableW) return;

                    const ratio = Math.max(0.2, (availableW - 4) / naturalW);

                    // CSS zoom changes BOTH visual AND layout dimensions
                    // No sizer div needed — wrapper layout box automatically shrinks
                    (wrapper.style as any).zoom = String(ratio);
                });
            } finally {
                requestAnimationFrame(() => { isScaling = false; });
            }
        };

        let roRaf = 0;
        const ro = new ResizeObserver(() => {
            cancelAnimationFrame(roRaf);
            roRaf = requestAnimationFrame(scale);
        });
        ro.observe(root);

        let moRaf = 0;
        const mo = new MutationObserver(() => {
            cancelAnimationFrame(moRaf);
            moRaf = requestAnimationFrame(scale);
        });
        mo.observe(root, { childList: true, subtree: true });

        let raf1 = 0, raf2 = 0;
        raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(scale); });

        return () => {
            cancelAnimationFrame(roRaf);
            cancelAnimationFrame(moRaf);
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
            ro.disconnect();
            mo.disconnect();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerRef, trigger]);
}
