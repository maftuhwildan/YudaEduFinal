'use client';

import React, { useMemo } from 'react';
import { User, Result, QuizPack, ClassGroup, ExamSession } from '@/types';
import { MissingStudents } from './MissingStudents';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, ShieldAlert, Users } from 'lucide-react';

interface ExamMonitoringProps {
    packs: QuizPack[];
    classes: ClassGroup[];
    users: User[];
    results: Result[];
    monitoringPackId: string;
    setMonitoringPackId: (v: string) => void;
    liveSessions: ExamSession[];
    sessionCounts: Record<string, number>;
}

export const ExamMonitoring: React.FC<ExamMonitoringProps> = ({
    packs, classes, users, results, monitoringPackId, setMonitoringPackId, liveSessions, sessionCounts
}) => {
    const totalActive = Object.values(sessionCounts).reduce((a, b) => a + b, 0);
    const activePacks = packs.filter(p => p.isActive);

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-primary" /> Live Exam Monitoring
                    </CardTitle>
                    <CardDescription>Real-time progress of students currently taking exams.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Active students overview */}
                    {totalActive > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {activePacks.map(p => (
                                <button
                                    key={p.id}
                                    onClick={() => setMonitoringPackId(p.id)}
                                    className={`flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all hover:shadow-sm ${monitoringPackId === p.id
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                        : 'border-border hover:border-primary/50'
                                        }`}
                                >
                                    <span className="text-xs font-medium text-muted-foreground truncate w-full">{p.name}</span>
                                    <div className="flex items-center gap-1.5">
                                        <Users className="w-4 h-4 text-primary" />
                                        <span className="text-lg font-bold">{sessionCounts[p.id] || 0}</span>
                                        <span className="text-xs text-muted-foreground">siswa</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {totalActive === 0 && (
                        <div className="text-center py-6 text-muted-foreground">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Tidak ada siswa yang sedang mengerjakan ujian.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {monitoringPackId && (
                <Card>
                    <CardContent className="px-4 pb-4 pt-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Student Name</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead className="w-1/3">Progress</TableHead>
                                    <TableHead>Cheat Flags</TableHead>
                                    <TableHead className="text-right">Last Active</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {liveSessions.map(s => {
                                    const progress = Math.round((s.answeredCount / s.totalQuestions) * 100) || 0;
                                    const isOnline = (Date.now() - Number(s.lastUpdate)) < 20000;
                                    const userClass = classes.find(c => c.id === s.classId)?.name || 'Unknown Class';

                                    return (
                                        <TableRow key={s.userId} className={isOnline ? '' : 'opacity-50'}>
                                            <TableCell>
                                                <Badge variant={isOnline ? "default" : "secondary"} className={isOnline ? "animate-pulse" : ""}>
                                                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-bold">{s.fullName || s.username}</div>
                                                <div className="text-xs text-muted-foreground font-mono">{s.username}</div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground">{userClass}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold">{s.answeredCount} / {s.totalQuestions}</span>
                                                    <span className="text-xs text-muted-foreground ml-auto">{progress}%</span>
                                                </div>
                                                <Progress value={progress} className="h-2" />
                                            </TableCell>
                                            <TableCell>
                                                {s.cheatCount > 0 ? (
                                                    <Badge variant="destructive">
                                                        <ShieldAlert className="w-3 h-3 mr-1" /> {s.cheatCount} Flags
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">None</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                                {new Date(Number(s.lastUpdate)).toLocaleTimeString()}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {liveSessions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12 text-muted-foreground italic">
                                            No active students monitored in this session.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {monitoringPackId && (() => {
                const selectedPack = packs.find(p => p.id === monitoringPackId);
                if (!selectedPack) return null;
                const allowedClassIds = Array.isArray(selectedPack.allowedClassIds)
                    ? selectedPack.allowedClassIds as string[]
                    : (typeof selectedPack.allowedClassIds === 'string' ? JSON.parse(selectedPack.allowedClassIds || '[]') : []);
                // Combine active sessions + completed results to avoid showing finished students as "missing"
                const packName = selectedPack.name;
                const takenUserIds = new Set([
                    ...liveSessions.map(s => s.userId),
                    ...results.filter(r => r.packName === packName).map(r => r.userId)
                ]);
                return (
                    <MissingStudents
                        users={users}
                        classes={classes}
                        allowedClassIds={allowedClassIds}
                        takenUserIds={takenUserIds}
                        variant="monitoring"
                    />
                );
            })()}
        </div>
    );
};
