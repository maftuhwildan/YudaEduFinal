/**
 * Lightweight logger utility.
 * - All levels (info, warn, error) are output in BOTH dev and production.
 * - In production: adds ISO timestamp prefix, suppresses error stack traces.
 * - In dev: uses raw console output with full stack traces.
 */

const isDev = process.env.NODE_ENV !== 'production';

function timestamp(): string {
    return new Date().toISOString();
}

export const logger = {
    error: (...args: any[]) => {
        if (isDev) {
            console.error(...args);
        } else {
            const message = args.map(a =>
                a instanceof Error ? a.message : (typeof a === 'string' ? a : '')
            ).filter(Boolean).join(' ');
            if (message) console.error(`${timestamp()} [ERROR] ${message}`);
        }
    },
    warn: (...args: any[]) => {
        if (isDev) {
            console.warn(...args);
        } else {
            const message = args.map(a =>
                typeof a === 'string' ? a : JSON.stringify(a)
            ).filter(Boolean).join(' ');
            if (message) console.warn(`${timestamp()} [WARN] ${message}`);
        }
    },
    info: (...args: any[]) => {
        if (isDev) {
            console.log(...args);
        } else {
            const message = args.map(a =>
                typeof a === 'string' ? a : JSON.stringify(a)
            ).filter(Boolean).join(' ');
            if (message) console.log(`${timestamp()} [INFO] ${message}`);
        }
    },
};
