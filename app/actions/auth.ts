'use server';

import { prisma } from '../lib/prisma';
import { compare, hash } from 'bcryptjs';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';

// --- Rate Limiting (WARN-4) ---
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 60 * 1000; // 60 seconds

function checkRateLimit(username: string): { allowed: boolean; retryAfterMs?: number } {
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

// Cleanup stale entries periodically (prevent memory leak)
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of loginAttempts) {
        if (now > entry.resetAt) loginAttempts.delete(key);
    }
}, 5 * 60 * 1000); // Clean every 5 minutes

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
        const user = await prisma.user.findFirst({
            where: { username },
            include: { class: true }
        });

        if (!user) return { error: 'Invalid credentials' };

        // Verify password using bcrypt compare
        const isPasswordValid = await compare(password, user.passwordHash);
        if (!isPasswordValid) return { error: 'Invalid credentials' };

        // Generate unique session token — overwrites any previous token,
        // kicking out the old device on its next request
        const sessionToken = randomUUID();
        await prisma.user.update({
            where: { id: user.id },
            data: { sessionToken }
        });

        const sessionData = {
            sessionToken,
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            classId: user.classId,
            className: user.class?.name,
            profileImage: user.profileImage
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

export async function getSession() {
    const sessionCookie = (await cookies()).get('session');
    if (!sessionCookie) return null;

    try {
        const data = JSON.parse(sessionCookie.value);
        if (!data?.id || !data?.sessionToken) return null;

        // Validate token against DB — if it doesn't match, session was
        // invalidated by a login from another device
        const user = await prisma.user.findUnique({
            where: { id: data.id },
            select: { sessionToken: true }
        });

        if (!user || user.sessionToken !== data.sessionToken) {
            // Token mismatch → session kicked by another login
            (await cookies()).delete('session');
            return null;
        }

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
            const existing = await prisma.user.findFirst({ where: { username: input.username } });
            if (existing) return { error: 'Username sudah digunakan' };
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
            profileImage: updated.profileImage
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
        return { error: e.message || 'Gagal mengupdate profil' };
    }
}
