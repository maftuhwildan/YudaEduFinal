'use server';

import { prisma } from '../lib/prisma';
import { compare, hash } from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';

// --- Rate Limiting ---
// NOTE: This in-memory Map is per-process. It works correctly for single-process
// deployments (Docker single instance, PM2 single worker). For multi-process/
// serverless deployments, replace with a shared store (Redis, Upstash, etc.).
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000; // 60 seconds

function checkRateLimit(username: string): { allowed: boolean; retryAfterMs?: number } {
    cleanupStaleEntries(); // lazy cleanup on each check
    const now = Date.now();
    const entry = loginAttempts.get(username);

    if (!entry || now > entry.resetAt) {
        loginAttempts.set(username, { count: 1, resetAt: now + WINDOW_MS });
        return { allowed: true };
    }

    if (entry.count >= MAX_ATTEMPTS) {
        return { allowed: false, retryAfterMs: entry.resetAt - now };
    }

    entry.count++;
    return { allowed: true };
}

// Lazy cleanup: run at most once per WINDOW_MS, piggybacking on checkRateLimit calls
// (avoids module-level setInterval that can't be cleaned up on hot-reload)
let lastCleanup = 0;
function cleanupStaleEntries() {
    const now = Date.now();
    if (now - lastCleanup < WINDOW_MS) return;
    lastCleanup = now;
    for (const [key, entry] of loginAttempts) {
        if (now > entry.resetAt) loginAttempts.delete(key);
    }
}

export async function login(formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    // Rate limit check
    const rateCheck = checkRateLimit(username);
    if (!rateCheck.allowed) {
        const retrySeconds = Math.ceil((rateCheck.retryAfterMs || 0) / 1000);
        return { error: `Terlalu banyak percobaan login. Coba lagi dalam ${retrySeconds} detik.` };
    }

    try {
        // Get client IP for logging (from Nginx x-forwarded-for header)
        const headersList = await headers();
        const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim()
            || headersList.get('x-real-ip')
            || 'unknown';

        const user = await prisma.user.findFirst({
            where: { username },
            include: { class: true }
        });

        if (!user) {
            logger.warn(`[LOGIN FAILED] username=${username} ip=${ip} reason=user_not_found`);
            return { error: 'Invalid credentials' };
        }

        // Verify password using bcrypt compare
        const isPasswordValid = await compare(password, user.passwordHash);
        if (!isPasswordValid) {
            logger.warn(`[LOGIN FAILED] username=${username} ip=${ip} reason=wrong_password`);
            return { error: 'Invalid credentials' };
        }

        // Log if this login will kick an existing session
        if (user.sessionToken) {
            logger.info(`[SESSION KICK] username=${username} ip=${ip} old_session_overwritten`);
        }

        // Generate unique session token — overwrites any previous token,
        // kicking out the old device on its next request
        const sessionToken = randomUUID();
        await prisma.user.update({
            where: { id: user.id },
            data: { sessionToken }
        });

        logger.info(`[LOGIN OK] username=${username} ip=${ip} role=${user.role}`);

        const sessionData = {
            sessionToken,
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            classId: user.classId,
            className: user.class?.name,
            profileImage: user.profileImage,
            _lastValidated: Date.now(),
        };

        (await cookies()).set('session', JSON.stringify(sessionData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24, // 24 hours
        });
        return { success: true, user: sessionData };
    } catch (e: any) {
        logger.error('Login error:', e);
        return { error: e.message || 'Terjadi kesalahan saat login' };
    }
}

export async function logout() {
    // Clear session token in DB so the token can never be reused
    const sessionCookie = (await cookies()).get('session');
    if (sessionCookie) {
        try {
            const data = JSON.parse(sessionCookie.value);
            if (data?.id && data?.sessionToken) {
                // Only clear the DB token if it still matches our cookie's token.
                // If another device has already overwritten it, don't touch it.
                await prisma.user.updateMany({
                    where: { id: data.id, sessionToken: data.sessionToken },
                    data: { sessionToken: null }
                });
            }
        } catch { /* cookie invalid, just delete */ }
    }

    (await cookies()).delete('session');
    return { success: true };
}

// How often to re-validate session token against the database (ms).
// Between validations, the cookie is trusted (like the old YudaEdu version).
// This keeps the "kick session" feature working while drastically reducing DB load.
const SESSION_REVALIDATE_MS = 60_000; // 60 seconds

export async function getSession() {
    const sessionCookie = (await cookies()).get('session');
    if (!sessionCookie) return null;

    try {
        const data = JSON.parse(sessionCookie.value);
        if (!data?.id || !data?.sessionToken) return null;

        const now = Date.now();
        const lastValidated = data._lastValidated || 0;

        // Only hit the DB if enough time has passed since last validation
        if (now - lastValidated > SESSION_REVALIDATE_MS) {
            const user = await prisma.user.findUnique({
                where: { id: data.id },
                select: { sessionToken: true }
            });

            if (!user || user.sessionToken !== data.sessionToken) {
                // Token mismatch → session kicked by another login
                (await cookies()).delete('session');
                return null;
            }

            // Refresh the cookie with updated validation timestamp
            const refreshed = { ...data, _lastValidated: now };
            (await cookies()).set('session', JSON.stringify(refreshed), {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24,
            });

            return refreshed;
        }

        // Within revalidation window — trust the cookie (no DB query)
        return data;
    } catch {
        return null;
    }
}

// --- Admin Profile Update ---
export async function updateAdminProfile(input: {
    fullName?: string;
    username?: string;
    currentPassword?: string;
    newPassword?: string;
    profileImage?: string | null;
}) {
    const session = await getSession();
    if (!session) return { error: 'Unauthorized' };
    if (session.role !== 'ADMIN') return { error: 'Forbidden' };

    try {
        const user = await prisma.user.findUnique({ where: { id: session.id } });
        if (!user) return { error: 'User not found' };

        const updateData: any = {};

        // Update fullName
        if (input.fullName !== undefined) {
            updateData.fullName = input.fullName || null;
        }

        // Update username
        if (input.username && input.username !== user.username) {
            updateData.username = input.username;
        }

        // Update password (requires current password verification)
        if (input.newPassword) {
            if (!input.currentPassword) return { error: 'Password lama harus diisi' };
            const isValid = await compare(input.currentPassword, user.passwordHash);
            if (!isValid) return { error: 'Password lama salah' };
            updateData.passwordHash = await hash(input.newPassword, 12);
        }

        // Update profile image
        if (input.profileImage !== undefined) {
            updateData.profileImage = input.profileImage;
        }

        // Apply updates
        const updated = await prisma.user.update({
            where: { id: session.id },
            data: updateData,
            include: { class: true }
        });

        // Refresh session cookie with updated data
        const newSessionData = {
            sessionToken: session.sessionToken,
            id: updated.id,
            username: updated.username,
            fullName: updated.fullName,
            role: updated.role,
            classId: updated.classId,
            className: updated.class?.name,
            profileImage: updated.profileImage,
            _lastValidated: Date.now(),
        };

        (await cookies()).set('session', JSON.stringify(newSessionData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24,
        });

        return { success: true, user: newSessionData };
    } catch (e: any) {
        logger.error('Update profile error:', e);
        // P2002 = unique constraint violation (username already taken by another user)
        if (e.code === 'P2002') return { error: 'Username sudah digunakan' };
        return { error: 'Gagal mengupdate profil' };
    }
}
