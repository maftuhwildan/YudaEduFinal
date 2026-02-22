'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => (
    <Card>
        <CardContent className="p-0">
            <div className="border-b px-4 py-3 flex gap-4">
                {Array.from({ length: cols }).map((_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex gap-4 border-b last:border-b-0">
                    {Array.from({ length: cols }).map((_, j) => (
                        <Skeleton key={j} className="h-4 flex-1" />
                    ))}
                </div>
            ))}
        </CardContent>
    </Card>
);

export const CardSkeleton: React.FC = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
        </CardContent>
    </Card>
);

export const TabSkeleton: React.FC<{ type?: 'table' | 'cards' }> = ({ type = 'table' }) => (
    <div className="space-y-6 animate-in fade-in duration-300">
        {/* Toolbar skeleton */}
        <Card>
            <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72 mt-1" />
            </CardHeader>
            <CardContent>
                <div className="flex gap-3">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </CardContent>
        </Card>

        {type === 'table' ? (
            <TableSkeleton rows={6} cols={5} />
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                    <CardSkeleton key={i} />
                ))}
            </div>
        )}
    </div>
);
