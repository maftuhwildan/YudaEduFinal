import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';
import { getSession } from '@/app/actions/auth';
import { logger } from '@/lib/logger';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

async function requireAdmin() {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return null; // authorized
}

export async function POST(req: NextRequest) {
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type. Only JPG, PNG, GIF, and WebP are allowed.' }, { status: 400 });
        }

        if (file.size > MAX_SIZE) {
            return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 400 });
        }

        // Ensure upload directory exists
        if (!existsSync(UPLOAD_DIR)) {
            await mkdir(UPLOAD_DIR, { recursive: true });
        }

        // Generate unique filename
        const ext = path.extname(file.name) || '.jpg';
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
        const filePath = path.join(UPLOAD_DIR, uniqueName);

        // Write file to disk
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(filePath, buffer);

        return NextResponse.json({ url: `/uploads/${uniqueName}` });
    } catch (error) {
        logger.error('Upload error:', error);
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    const authError = await requireAdmin();
    if (authError) return authError;

    try {
        const { url } = await req.json();

        if (!url || !url.startsWith('/uploads/')) {
            return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
        }

        const filename = path.basename(url);
        const filePath = path.join(UPLOAD_DIR, filename);

        // Prevent path traversal
        if (!filePath.startsWith(UPLOAD_DIR)) {
            return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
        }

        if (existsSync(filePath)) {
            await unlink(filePath);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Delete error:', error);
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }
}
