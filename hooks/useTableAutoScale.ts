'use client';

import { useEffect } from 'react';

/**
 * useTableAutoScale — Auto-zooms tables that overflow their mobile container.
 *
 * Architecture:
 *  - Each scalable area wrapped in `.quiz-scale-area` (overflow:hidden).
 *  - Natural table width measured via OFF-SCREEN CLONE (bypasses all constraints).
 *  - Available width = quiz-scale-area.clientWidth.
 *  - ResizeObserver + MutationObserver for reactive re-scaling.
 *  - Does NOT depend on `answers` state.
 *
 * Sizer wrapper:
 *  After transform:scale(), wraps quiz-table-wrapper in a div with scaled dimensions
 *  + overflow:hidden. This constrains the layout box to match the visual size,
 *  preventing mobile browsers from detecting the original wide size as scrollable.
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

                // Phase 1: Remove old sizer wrappers and reset transforms
                wrappers.forEach(w => {
                    w.style.transform = '';
                    w.style.transformOrigin = '';

                    const parent = w.parentElement;
                    if (parent?.classList.contains('quiz-table-sizer')) {
                        parent.replaceWith(w);
                    }
                });
                void root.offsetHeight;

                // Phase 2: measure & collect
                type Job = {
                    wrapper: HTMLElement;
                    ratio: number;
                    scaledW: number;
                    scaledH: number;
                };
                const jobs: Job[] = [];

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

                    const ratio = Math.max(0.2, availableW / naturalW);
                    const naturalH = wrapper.offsetHeight;
                    jobs.push({
                        wrapper,
                        ratio,
                        scaledW: Math.ceil(availableW),
                        scaledH: Math.ceil(naturalH * ratio),
                    });
                });

                // Phase 3: apply transforms with sizer wrapper
                jobs.forEach(({ wrapper, ratio, scaledW, scaledH }) => {
                    wrapper.style.transformOrigin = 'top left';
                    wrapper.style.transform = `scale(${ratio})`;

                    const sizer = document.createElement('div');
                    sizer.className = 'quiz-table-sizer';
                    sizer.style.width = scaledW + 'px';
                    sizer.style.height = scaledH + 'px';
                    sizer.style.overflow = 'hidden';

                    wrapper.parentNode?.insertBefore(sizer, wrapper);
                    sizer.appendChild(wrapper);
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
