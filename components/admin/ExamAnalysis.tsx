'use client';

import React from 'react';
import { QuizPack } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    BarChart3, Activity, FileQuestion, School,
    Users as UsersIcon, TrendingUp, TrendingDown, Trophy, Hash
} from 'lucide-react';

interface ExamAnalysisProps {
    packs: QuizPack[];
    analysisPackId: string;
    setAnalysisPackId: (v: string) => void;
    analysisData: any;
}

export const ExamAnalysis: React.FC<ExamAnalysisProps> = ({
    packs, analysisPackId, setAnalysisPackId, analysisData
}) => {
    return (
        <div className="space-y-6">
            {/* Pack Selector */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Exam Analysis
                    </CardTitle>
                    <CardDescription>View detailed statistics and performance metrics for each exam.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Select value={analysisPackId} onValueChange={setAnalysisPackId}>
                        <SelectTrigger className="max-w-xs">
                            <SelectValue placeholder="Select Exam Pack" />
                        </SelectTrigger>
                        <SelectContent>
                            {packs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </CardContent>
            </Card>

            {analysisData && (analysisData as any).summary && (() => {
                const s = (analysisData as any).summary;
                const qs = (analysisData as any).questions || [];
                const hasReal = (analysisData as any).hasRealAnswers;
                return (
                    <>
                        {/* Summary Statistics - 6 cards */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 mb-1">
                                        <UsersIcon className="w-4 h-4 text-primary" />
                                        <span className="text-xs text-muted-foreground">Siswa</span>
                                    </div>
                                    <div className="text-2xl font-bold text-primary">{s.totalStudents}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 mb-1">
                                        <BarChart3 className="w-4 h-4 text-blue-500" />
                                        <span className="text-xs text-muted-foreground">Rata-rata</span>
                                    </div>
                                    <div className="text-2xl font-bold">{s.avgScore}%</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                        <span className="text-xs text-muted-foreground">Pass Rate (≥75)</span>
                                    </div>
                                    <div className="text-2xl font-bold text-green-600">{s.passRate}%</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Hash className="w-4 h-4 text-orange-500" />
                                        <span className="text-xs text-muted-foreground">Median</span>
                                    </div>
                                    <div className="text-2xl font-bold">{s.median}%</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Activity className="w-4 h-4 text-purple-500" />
                                        <span className="text-xs text-muted-foreground">Std Deviasi</span>
                                    </div>
                                    <div className="text-2xl font-bold">{s.stdDev}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 mb-1">
                                        <FileQuestion className="w-4 h-4 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">Soal</span>
                                    </div>
                                    <div className="text-2xl font-bold">{s.totalQuestions}</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Score Range & Distribution */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Score Range</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Highest Score</span>
                                        <Badge variant="default" className="text-lg px-3">{s.highestScore}%</Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Lowest Score</span>
                                        <Badge variant="secondary" className="text-lg px-3">{s.lowestScore}%</Badge>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Avg Cheat Flags</span>
                                        <Badge variant={s.avgCheatCount > 1 ? "destructive" : "secondary"}>
                                            {s.avgCheatCount}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Score Distribution</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {[
                                        { label: 'Excellent (≥90)', count: s.distribution.excellent, color: 'text-green-600', bg: 'bg-green-500' },
                                        { label: 'Good (75-89)', count: s.distribution.good, color: 'text-blue-600', bg: 'bg-blue-500' },
                                        { label: 'Average (60-74)', count: s.distribution.average, color: 'text-yellow-600', bg: 'bg-yellow-500' },
                                        { label: 'Poor (<60)', count: s.distribution.poor, color: 'text-red-600', bg: 'bg-red-500' },
                                    ].map(d => (
                                        <div key={d.label} className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span>{d.label}</span>
                                                <span className={`font-bold ${d.color}`}>{d.count}</span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div className={`h-full ${d.bg} rounded-full transition-all`} style={{ width: `${s.totalStudents > 0 ? (d.count / s.totalStudents) * 100 : 0}%` }} />
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Per-Class Breakdown */}
                        {s.perClass && s.perClass.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <School className="w-4 h-4" />
                                        Performa Per Kelas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-4 pb-4 pt-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Kelas</TableHead>
                                                <TableHead className="text-center">Siswa</TableHead>
                                                <TableHead className="text-center">Rata-rata</TableHead>
                                                <TableHead className="text-center">Pass Rate</TableHead>
                                                <TableHead className="text-center">Tertinggi</TableHead>
                                                <TableHead className="text-center">Terendah</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {s.perClass.map((c: any) => (
                                                <TableRow key={c.classId}>
                                                    <TableCell className="font-medium">{c.className}</TableCell>
                                                    <TableCell className="text-center font-mono">{c.studentCount}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={c.avgScore >= 75 ? "default" : "destructive"}>
                                                            {c.avgScore}%
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className={c.passRate >= 75 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{c.passRate}%</span>
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono text-green-600">{c.highest}%</TableCell>
                                                    <TableCell className="text-center font-mono text-red-600">{c.lowest}%</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Top & Bottom Students */}
                        {s.topStudents && s.topStudents.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Trophy className="w-4 h-4 text-yellow-500" />
                                            Top 5 Siswa
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {s.topStudents.map((st: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${idx === 0 ? 'bg-yellow-100 text-yellow-700' : idx === 1 ? 'bg-gray-100 text-gray-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-muted text-muted-foreground'}`}>
                                                        {idx + 1}
                                                    </span>
                                                    <div>
                                                        <div className="text-sm font-medium">{st.fullName}</div>
                                                        <div className="text-xs text-muted-foreground">{st.className}</div>
                                                    </div>
                                                </div>
                                                <Badge variant="default">{Number(st.score).toFixed(2)}</Badge>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <TrendingDown className="w-4 h-4 text-red-500" />
                                            Bottom 5 Siswa
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {s.bottomStudents.map((st: any, idx: number) => (
                                            <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-muted/50">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-muted text-muted-foreground">
                                                        {s.totalStudents - idx}
                                                    </span>
                                                    <div>
                                                        <div className="text-sm font-medium">{st.fullName}</div>
                                                        <div className="text-xs text-muted-foreground">{st.className}</div>
                                                    </div>
                                                </div>
                                                <Badge variant="destructive">{Number(st.score).toFixed(2)}</Badge>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* Question Analysis Table */}
                        {qs.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Analisis Per Soal</CardTitle>
                                    <CardDescription>
                                        {hasReal
                                            ? 'Berdasarkan jawaban siswa yang sebenarnya'
                                            : 'Estimasi berdasarkan skor rata-rata (data jawaban detail belum tersedia)'}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="px-4 pb-4 pt-0">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-12">#</TableHead>
                                                <TableHead>Soal</TableHead>
                                                <TableHead className="w-16">Var</TableHead>
                                                <TableHead className="w-20 text-center">Jawab</TableHead>
                                                <TableHead className="w-20 text-center">Benar</TableHead>
                                                <TableHead className="w-24 text-center">Kunci</TableHead>
                                                <TableHead className="w-40">Tingkat Kesulitan</TableHead>
                                                {hasReal && <TableHead className="min-w-[200px]">Distribusi Jawaban</TableHead>}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {qs.map((q: any, idx: number) => (
                                                <TableRow key={q.questionId}>
                                                    <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                                                    <TableCell>
                                                        <div className="max-w-xs truncate text-sm" dangerouslySetInnerHTML={{ __html: q.text.replace(/<[^>]*>/g, '').substring(0, 80) + (q.text.length > 80 ? '...' : '') }} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">{q.variant}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono">{q.attempts}</TableCell>
                                                    <TableCell className="text-center font-mono">{q.correctCount}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className="font-bold">{q.correctLabel}</Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-2 flex-1 bg-muted rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all ${q.difficultyIndex >= 0.7 ? 'bg-green-500' : q.difficultyIndex >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${q.difficultyIndex * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className={`text-xs font-bold w-14 text-right ${q.difficultyIndex >= 0.7 ? 'text-green-600' : q.difficultyIndex >= 0.4 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                                {q.difficultyIndex >= 0.7 ? 'Mudah' : q.difficultyIndex >= 0.4 ? 'Sedang' : 'Sulit'}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    {hasReal && (
                                                        <TableCell>
                                                            {q.optionCounts && (
                                                                <div className="flex items-end gap-1 h-8">
                                                                    {q.optionLabels.map((label: string) => {
                                                                        const count = q.optionCounts[label] || 0;
                                                                        const pct = q.attempts > 0 ? (count / q.attempts) * 100 : 0;
                                                                        const isCorrect = label === q.correctLabel;
                                                                        return (
                                                                            <div key={label} className="flex flex-col items-center gap-0.5 flex-1" title={`${label}: ${count} (${pct.toFixed(0)}%)`}>
                                                                                <div className="w-full rounded-t-sm relative" style={{ height: `${Math.max(pct * 0.28, 2)}px`, backgroundColor: isCorrect ? '#22c55e' : count > 0 ? '#ef4444' : '#e5e7eb' }} />
                                                                                <span className={`text-[10px] font-bold ${isCorrect ? 'text-green-600' : 'text-muted-foreground'}`}>{label}</span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    )}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}
                    </>
                );
            })()}

            {(!analysisData || !(analysisData as any).summary) && analysisPackId && (
                <Card className="border-dashed">
                    <CardContent className="text-center py-12 text-muted-foreground">
                        No analysis data available. Students need to complete the exam first.
                    </CardContent>
                </Card>
            )}

            {!analysisPackId && (
                <Card className="border-dashed">
                    <CardContent className="text-center py-12 text-muted-foreground">
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        Select an exam pack above to view analysis.
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
