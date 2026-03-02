'use client';

import React, { useState, useMemo } from 'react';
import { QuizPack } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    BarChart3, Activity, FileQuestion, School,
    Users as UsersIcon, TrendingUp, TrendingDown, Trophy, Hash, Eye
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
    const [classFilter, setClassFilter] = useState<string>('ALL');
    const [selectedQuestion, setSelectedQuestion] = useState<any>(null);

    // Get available classes from perClass data
    const availableClasses = useMemo(() => {
        if (!analysisData?.summary?.perClass) return [];
        return analysisData.summary.perClass;
    }, [analysisData]);

    // Filtered summary based on selected class
    const filteredSummary = useMemo(() => {
        if (!analysisData?.summary) return null;
        const s = analysisData.summary;
        if (classFilter === 'ALL') return s;

        // Find the selected class stats
        const classData = s.perClass?.find((c: any) => c.classId === classFilter);
        if (!classData) return s;

        // Create filtered summary from class data
        return {
            ...s,
            totalStudents: classData.studentCount,
            avgScore: classData.avgScore,
            highestScore: classData.highest,
            lowestScore: classData.lowest,
            passRate: classData.passRate,
            median: classData.median,
            stdDev: classData.stdDev,
            distribution: classData.distribution,
        };
    }, [analysisData, classFilter]);

    // Reset class filter when pack changes
    React.useEffect(() => {
        setClassFilter('ALL');
    }, [analysisPackId]);

    return (
        <div className="space-y-6">
            {/* Pack Selector + Class Filter */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        Analisis Ujian
                    </CardTitle>
                    <CardDescription>Lihat statistik mendetail dan metrik performa untuk setiap ujian.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <Select value={analysisPackId} onValueChange={setAnalysisPackId}>
                            <SelectTrigger className="max-w-xs">
                                <SelectValue placeholder="Pilih Paket Ujian" />
                            </SelectTrigger>
                            <SelectContent>
                                {packs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                        </Select>

                        {/* Class Filter */}
                        {availableClasses.length > 0 && (
                            <Select value={classFilter} onValueChange={setClassFilter}>
                                <SelectTrigger className="max-w-xs">
                                    <School className="w-4 h-4 mr-2 shrink-0" />
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Semua Kelas</SelectItem>
                                    {availableClasses.map((c: any) => (
                                        <SelectItem key={c.classId} value={c.classId}>
                                            {c.className} ({c.studentCount} siswa)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </CardContent>
            </Card>

            {filteredSummary && (() => {
                const s = filteredSummary;
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
                                    <div className="text-2xl font-bold">{s.avgScore}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                        <span className="text-xs text-muted-foreground">Tingkat Kelulusan (≥75)</span>
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
                                    <div className="text-2xl font-bold">{s.median}</div>
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
                                    <CardTitle className="text-base">Rentang Nilai</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Nilai Tertinggi</span>
                                        <Badge variant="default" className="text-lg px-3">{s.highestScore}</Badge>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Nilai Terendah</span>
                                        <Badge variant="secondary" className="text-lg px-3">{s.lowestScore}</Badge>
                                    </div>
                                    <Separator />
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Rata-rata Peringatan Curang</span>
                                        <Badge variant={s.avgCheatCount > 1 ? "destructive" : "secondary"}>
                                            {s.avgCheatCount}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            {s.distribution && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Distribusi Nilai</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {[
                                            { label: 'Sangat Baik (≥90)', count: s.distribution.excellent, color: 'text-green-600', bg: 'bg-green-500' },
                                            { label: 'Baik (75-89)', count: s.distribution.good, color: 'text-blue-600', bg: 'bg-blue-500' },
                                            { label: 'Cukup (60-74)', count: s.distribution.average, color: 'text-yellow-600', bg: 'bg-yellow-500' },
                                            { label: 'Kurang (<60)', count: s.distribution.poor, color: 'text-red-600', bg: 'bg-red-500' },
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
                            )}
                        </div>

                        {/* Per-Class Breakdown — only show when viewing ALL */}
                        {classFilter === 'ALL' && s.perClass && s.perClass.length > 0 && (
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
                                                            {c.avgScore}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className={c.passRate >= 75 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{c.passRate}%</span>
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono text-green-600">{c.highest}</TableCell>
                                                    <TableCell className="text-center font-mono text-red-600">{c.lowest}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Top & Bottom Students — only show when viewing ALL */}
                        {classFilter === 'ALL' && s.topStudents && s.topStudents.length > 0 && (
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
                                                <Badge variant="default">{Math.round(Number(st.score))}</Badge>
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
                                                <Badge variant="destructive">{Math.round(Number(st.score))}</Badge>
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
                                            ? 'Berdasarkan jawaban siswa yang sebenarnya. Klik soal untuk melihat detail.'
                                            : 'Estimasi berdasarkan skor rata-rata. Klik soal untuk melihat detail.'}
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
                                                <TableRow
                                                    key={q.questionId}
                                                    className="cursor-pointer hover:bg-muted/50"
                                                    onClick={() => setSelectedQuestion(q)}
                                                >
                                                    <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                                                    <TableCell>
                                                        <div className="max-w-xs truncate text-sm flex items-center gap-2">
                                                            <Eye className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                            <span dangerouslySetInnerHTML={{ __html: q.text.replace(/<[^>]*>/g, '').substring(0, 60) + (q.text.replace(/<[^>]*>/g, '').length > 60 ? '...' : '') }} />
                                                        </div>
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
                        Tidak ada data analisis. Siswa harus menyelesaikan ujian terlebih dahulu.
                    </CardContent>
                </Card>
            )}

            {!analysisPackId && (
                <Card className="border-dashed">
                    <CardContent className="text-center py-12 text-muted-foreground">
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        Pilih paket ujian di atas untuk melihat analisis.
                    </CardContent>
                </Card>
            )}

            {/* Question Detail Dialog */}
            <Dialog open={!!selectedQuestion} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
                <DialogContent className="max-w-2xl max-h-[85vh]">
                    {selectedQuestion && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <FileQuestion className="w-5 h-5 text-primary" />
                                    Detail Soal
                                </DialogTitle>
                                <DialogDescription className="flex items-center gap-2">
                                    Varian {selectedQuestion.variant} • Kunci Jawaban: {selectedQuestion.correctLabel}
                                    <Badge
                                        variant={selectedQuestion.difficultyIndex >= 0.7 ? 'default' : selectedQuestion.difficultyIndex >= 0.4 ? 'secondary' : 'destructive'}
                                    >
                                        {selectedQuestion.difficultyIndex >= 0.7 ? 'Mudah' : selectedQuestion.difficultyIndex >= 0.4 ? 'Sedang' : 'Sulit'}
                                    </Badge>
                                </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="max-h-[60vh] pr-4">
                                <div className="space-y-4">
                                    {/* Full Question Text */}
                                    <div className="bg-muted/50 rounded-lg p-4">
                                        <p className="text-sm font-medium text-muted-foreground mb-2">Pertanyaan:</p>
                                        <div
                                            className="prose prose-sm dark:prose-invert max-w-none"
                                            dangerouslySetInnerHTML={{ __html: selectedQuestion.text }}
                                        />
                                    </div>

                                    {/* Answer Options */}
                                    {selectedQuestion.optionLabels && selectedQuestion.optionLabels.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium text-muted-foreground">Pilihan Jawaban:</p>
                                            {selectedQuestion.optionLabels.map((label: string, idx: number) => {
                                                const isCorrect = label === selectedQuestion.correctLabel;
                                                const count = selectedQuestion.optionCounts?.[label] || 0;
                                                const pct = selectedQuestion.attempts > 0 ? (count / selectedQuestion.attempts) * 100 : 0;

                                                return (
                                                    <div
                                                        key={label}
                                                        className={`flex items-center gap-3 p-3 rounded-lg border ${isCorrect ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-border'}`}
                                                    >
                                                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${isCorrect ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                                                            {label}
                                                        </span>
                                                        <div className="flex-1 min-w-0">
                                                            <span className="text-sm">
                                                                {selectedQuestion.options?.[idx]
                                                                    ? <span dangerouslySetInnerHTML={{ __html: selectedQuestion.options[idx].replace(/<[^>]*>/g, '') }} />
                                                                    : `Opsi ${label}`
                                                                }
                                                                {isCorrect && <span className="ml-1.5 text-green-600 font-semibold">✓ Benar</span>}
                                                            </span>
                                                        </div>
                                                        {selectedQuestion.optionCounts && (
                                                            <div className="text-right">
                                                                <span className={`text-sm font-mono ${isCorrect ? 'text-green-600 font-bold' : count > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                                                    {count} ({pct.toFixed(0)}%)
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Stats Summary */}
                                    <Separator />
                                    <div className="grid grid-cols-3 gap-4 text-center">
                                        <div>
                                            <p className="text-2xl font-bold text-primary">{selectedQuestion.attempts}</p>
                                            <p className="text-xs text-muted-foreground">Menjawab</p>
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-green-600">{selectedQuestion.correctCount}</p>
                                            <p className="text-xs text-muted-foreground">Benar</p>
                                        </div>
                                        <div>
                                            <p className={`text-2xl font-bold ${selectedQuestion.difficultyIndex >= 0.7 ? 'text-green-600' : selectedQuestion.difficultyIndex >= 0.4 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {(selectedQuestion.difficultyIndex * 100).toFixed(0)}%
                                            </p>
                                            <p className="text-xs text-muted-foreground">Tingkat Benar</p>
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
