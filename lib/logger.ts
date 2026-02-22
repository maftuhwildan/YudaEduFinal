/**
 * Lightweight logger utility.
 * In production: suppresses verbose stack traces.
 * Future: can be extended to send to Sentry/LogRocket.
 */

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
    error: (...args: any[]) => {
        if (isDev) {
            console.error(...args);
        } else {
            // In production, log only the message (no stack traces to stdout)
            const message = args.map(a =>
                a instanceof Error ? a.message : (typeof a === 'string' ? a : '')
            ).filter(Boolean).join(' ');
            if (message) console.error(`[ERROR] ${message}`);
        }
    },
    warn: (...args: any[]) => {
        if (isDev) {
            console.warn(...args);
        }
    },
    info: (...args: any[]) => {
        if (isDev) {
            console.log(...args);
        }
    },
};
