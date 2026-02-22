import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
    try {
        const slides = await prisma.loginSlide.findMany({
            where: { isActive: true },
            orderBy: { order: 'asc' },
            select: {
                id: true,
                title: true,
                description: true,
                imageUrl: true,
                order: true,
            }
        });
        return NextResponse.json(slides);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch slides' }, { status: 500 });
    }
}
