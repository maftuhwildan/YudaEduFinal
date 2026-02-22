import { getSession } from '@/app/actions/auth';

/**
 * Shared auth guard — validates session token against DB.
 * Throws 'Unauthorized' if no valid session, 'Forbidden' if not ADMIN.
 */
export async function requireAdmin() {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');
    if (session.role !== 'ADMIN') throw new Error('Forbidden');
    return session;
}

/**
 * Requires any authenticated user (ADMIN or USER).
 */
export async function requireAuth() {
    const session = await getSession();
    if (!session) throw new Error('Unauthorized');
    return session;
}
