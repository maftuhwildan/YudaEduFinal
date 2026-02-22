'use client';

import React, { Dispatch, SetStateAction, useState, useMemo } from 'react';
import { User, Result, QuizPack, ClassGroup } from '@/types';
import { MissingStudents } from './MissingStudents';
import * as XLSX from 'xlsx';
import { resetUserAttempts } from '@/app/actions/admin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Download, ArrowUpDown, ChevronUp, ChevronDown, RotateCcw, Filter,
    Trash2, X, CheckSquare
} from 'lucide-react';

// Safari-safe date parsing
function safariSafeDate(value: any): Date {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    const str = String(value);
    return new Date(str.replace(' ', 'T'));
}

interface ExamResultsProps {
    users: User[];
    classes: ClassGroup[];
    packs: QuizPack[];
    results: Result[];
    selectedResultPackId: string;
    setSelectedResultPackId: (v: string) => void;
    resultSortBy: string;
    setResultSortBy: (v: any) => void;
    resultSortDir: 'asc' | 'desc';
    setResultSortDir: Dispatch<SetStateAction<'asc' | 'desc'>>;
    refreshData: () => void;
    activeSessionUserIds: string[];
    completedSessionUserIds: string[];
    onDeleteResult: (id: string) => Promise<void>;
    onBulkDeleteResults: (ids: string[]) => Promise<void>;
    onBulkResetUserAttempts: (userIds: string[], packId: string) => Promise<void>;
}

export const ExamResults: React.FC<ExamResultsProps> = ({
    users, classes, packs, results, selectedResultPackId, setSelectedResultPackId,
    resultSortBy, setResultSortBy, resultSortDir, setResultSortDir, refreshData,
    activeSessionUserIds, completedSessionUserIds, onDeleteResult, onBulkDeleteResults, onBulkResetUserAttempts
}) => {
    const [resultClassFilter, setResultClassFilter] = useState<string>('ALL');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [bulkLoading, setBulkLoading] = useState(false);

    // Get pack results — support both existing packs (by ID) and deleted packs (by name)
    const packResults = useMemo(() => {
        // If selectedResultPackId matches an existing pack, filter by packName
        const existingPack = packs.find(p => p.id === selectedResultPackId);
        if (existingPack) {
            return results.filter(r => r.packName === existingPack.name);
        }
        // Otherwise, selectedResultPackId might be a packName from a deleted pack
        return results.filter(r => r.packName === selectedResultPackId);
    }, [results, packs, selectedResultPackId]);

    // Build pack options: existing packs + orphaned pack names from results
    const packOptions = useMemo(() => {
        const existingPackNames = new Set(packs.map(p => p.name));
        const orphanedPackNames = new Set<string>();
        results.forEach(r => {
            if (!existingPackNames.has(r.packName)) {
                orphanedPackNames.add(r.packName);
            }
        });
        return {
            existing: packs,
            orphaned: Array.from(orphanedPackNames).sort(),
        };
    }, [packs, results]);

    // Get unique classes that have results
    const resultClasses = useMemo(() => {
        const classIds = new Set<string>();
        packResults.forEach(r => {
            const student = users.find(u => u.username === r.username);
            const cId = student?.classId || r.classId;
            if (cId) classIds.add(cId);
        });
        return classes.filter(c => classIds.has(c.id)).sort((a, b) => a.name.localeCompare(b.name));
    }, [packResults, users, classes]);

    // Filtered results by class
    const filteredResults = useMemo(() => {
        if (resultClassFilter === 'ALL') return packResults;
        return packResults.filter(r => {
            const student = users.find(u => u.username === r.username);
            const cId = student?.classId || r.classId;
            return cId === resultClassFilter;
        });
    }, [packResults, resultClassFilter, users]);

    // Compute attempt number per result (sorted by timestamp per user)
    const attemptMap = useMemo(() => {
        const map = new Map<string, number>();
        const byUser = new Map<string, Result[]>();
        packResults.forEach(r => {
            const arr = byUser.get(r.userId) || [];
            arr.push(r);
            byUser.set(r.userId, arr);
        });
        byUser.forEach(results => {
            results.sort((a, b) => safariSafeDate(a.timestamp).getTime() - safariSafeDate(b.timestamp).getTime());
            results.forEach((r, i) => map.set(r.id, i + 1));
        });
        return map;
    }, [packResults]);

    // Determine latest result per user (for showing retake icon only on latest)
    const latestResultIdPerUser = useMemo(() => {
        const latestMap = new Map<string, string>(); // userId -> resultId
        const byUser = new Map<string, Result[]>();
        packResults.forEach(r => {
            const arr = byUser.get(r.userId) || [];
            arr.push(r);
            byUser.set(r.userId, arr);
        });
        byUser.forEach((results, userId) => {
            results.sort((a, b) => safariSafeDate(a.timestamp).getTime() - safariSafeDate(b.timestamp).getTime());
            latestMap.set(userId, results[results.length - 1].id);
        });
        return latestMap;
    }, [packResults]);

    // Session sets for quick lookup
    const activeSessionSet = useMemo(() => new Set(activeSessionUserIds), [activeSessionUserIds]);
    const completedSessionSet = useMemo(() => new Set(completedSessionUserIds), [completedSessionUserIds]);

    // Helper: enrich and sort results for export (class name asc, then absent number asc)
    const getSortedExportData = (data: Result[]) => {
        return data.map(r => {
            const student = users.find(u => u.username === r.username);
            const className = classes.find(c => c.id === student?.classId)?.name || classes.find(c => c.id === r.classId)?.name || '-';
            const attempt = attemptMap.get(r.id) || 1;
            return {
                'No Absen': Number(student?.absentNumber) || 0,
                'Full Name': student?.fullName || r.username,
                'Class': className,
                'Username': r.username,
                'Attempt': attempt > 1 ? `Retake #${attempt - 1}` : 'Original',
                'Score': Math.round((Number(r.score) + Number.EPSILON) * 100) / 100,
                'Correct': Number(r.correctCount) || 0,
                'Total Questions': Number(r.totalQuestions) || 0,
                'Pack Name': r.packName,
                'Variant': r.variant || 'A',
                'Timestamp': safariSafeDate(r.timestamp).toLocaleString(),
                'Cheat Count': Number(r.cheatCount) || 0,
            };
        }).sort((a, b) => {
            const classCompare = a['Class'].localeCompare(b['Class']);
            if (classCompare !== 0) return classCompare;
            return a['No Absen'] - b['No Absen'];
        });
    };

    const handleExport = () => {
        const exportData = getSortedExportData(filteredResults);
        const ws = XLSX.utils.json_to_sheet(exportData);
        ws['!cols'] = [
            { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 18 },
            { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 16 },
            { wch: 25 }, { wch: 10 }, { wch: 22 }, { wch: 12 },
        ];
        const wb = XLSX.utils.book_new();
        const packName = packs.find(p => p.id === selectedResultPackId)?.name || selectedResultPackId;
        const sheetName = resultClassFilter === 'ALL' ? 'Results' : classes.find(c => c.id === resultClassFilter)?.name || 'Results';
        XLSX.utils.book_append_sheet(wb, ws, sheetName.substring(0, 31));
        const classLabel = resultClassFilter !== 'ALL' ? `-${classes.find(c => c.id === resultClassFilter)?.name || ''}` : '';
        XLSX.writeFile(wb, `results-${packName}${classLabel}.xlsx`);
    };

    // Checkbox helpers
    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredResults.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredResults.map(r => r.id)));
        }
    };

    const selectByClass = (classId: string) => {
        const classResultIds = filteredResults.filter(r => {
            const student = users.find(u => u.username === r.username);
            return (student?.classId || r.classId) === classId;
        }).map(r => r.id);
        setSelectedIds(prev => {
            const next = new Set(prev);
            classResultIds.forEach(id => next.add(id));
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    // Get retake status for a user based on ExamSession state:
    // - COMPLETED session exists → idle (student finished, can give retake)
    // - IN_PROGRESS session exists → in-exam
    // - NO session at all → waiting (retake was given, session was deleted)
    const getRetakeStatus = (userId: string): 'idle' | 'waiting' | 'in-exam' => {
        if (activeSessionSet.has(userId)) return 'in-exam';
        if (completedSessionSet.has(userId)) return 'idle';
        // No session exists — this means resetUserAttempts deleted it → waiting
        return 'waiting';
    };

    // Bulk action handlers
    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!confirm(`Hapus ${selectedIds.size} result yang dipilih? Tindakan ini tidak bisa dibatalkan.`)) return;
        setBulkLoading(true);
        try {
            await onBulkDeleteResults(Array.from(selectedIds));
            clearSelection();
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkRetake = async () => {
        const uniqueUserIds = [...new Set(
            filteredResults.filter(r => selectedIds.has(r.id)).map(r => r.userId)
        )];
        if (uniqueUserIds.length === 0) return;
        if (!confirm(`Izinkan ${uniqueUserIds.length} siswa untuk mengerjakan ujian ulang?`)) return;
        setBulkLoading(true);
        try {
            await onBulkResetUserAttempts(uniqueUserIds, selectedResultPackId);
            clearSelection();
        } finally {
            setBulkLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Exam Results</CardTitle>
                    <CardDescription>View and export student performance.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                        <div className="flex-1 w-full md:max-w-xs space-y-2">
                            <Label>Select Exam to View Results</Label>
                            <Select value={selectedResultPackId} onValueChange={(v) => { setSelectedResultPackId(v); setResultClassFilter('ALL'); clearSelection(); }}>
                                <SelectTrigger><SelectValue placeholder="-- Select Exam Pack --" /></SelectTrigger>
                                <SelectContent>
                                    {packOptions.existing.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                    {packOptions.orphaned.length > 0 && (
                                        <>
                                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1">Pack Terhapus</div>
                                            {packOptions.orphaned.map(name => <SelectItem key={name} value={name}>{name} <span className="text-muted-foreground">(Dihapus)</span></SelectItem>)}
                                        </>
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        {selectedResultPackId && (
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Class Filter */}
                                <Select value={resultClassFilter} onValueChange={(v) => { setResultClassFilter(v); clearSelection(); }}>
                                    <SelectTrigger className="w-[180px]">
                                        <Filter className="w-4 h-4 mr-2 shrink-0" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Semua Kelas ({packResults.length})</SelectItem>
                                        {resultClasses.map(c => {
                                            const count = packResults.filter(r => {
                                                const student = users.find(u => u.username === r.username);
                                                return (student?.classId || r.classId) === c.id;
                                            }).length;
                                            return <SelectItem key={c.id} value={c.id}>{c.name} ({count})</SelectItem>;
                                        })}
                                    </SelectContent>
                                </Select>

                                {/* Sort */}
                                <Select value={resultSortBy} onValueChange={(v: any) => setResultSortBy(v)}>
                                    <SelectTrigger className="w-[160px]">
                                        <ArrowUpDown className="w-4 h-4 mr-2 shrink-0" />
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="time">Waktu</SelectItem>
                                        <SelectItem value="name">Nama</SelectItem>
                                        <SelectItem value="absen">No Absen</SelectItem>
                                        <SelectItem value="class">Kelas</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setResultSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                                    title={resultSortDir === 'asc' ? 'Ascending' : 'Descending'}
                                >
                                    {resultSortDir === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                                <Button onClick={handleExport}>
                                    <Download className="w-4 h-4 mr-2" /> Export {resultClassFilter !== 'ALL' ? `(${filteredResults.length})` : ''}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="py-3 px-4">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                            <div className="flex items-center gap-3">
                                <CheckSquare className="w-5 h-5 text-primary" />
                                <span className="font-medium text-sm">{selectedIds.size} dipilih</span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* Select by class */}
                                <Select onValueChange={selectByClass}>
                                    <SelectTrigger className="w-[160px] h-8 text-xs">
                                        <Filter className="w-3 h-3 mr-1 shrink-0" />
                                        <span>Pilih Kelas</span>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {resultClasses.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-amber-600 border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                                    onClick={handleBulkRetake}
                                    disabled={bulkLoading}
                                >
                                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                    Retake ({[...new Set(filteredResults.filter(r => selectedIds.has(r.id)).map(r => r.userId))].length} siswa)
                                </Button>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                                    onClick={handleBulkDelete}
                                    disabled={bulkLoading}
                                >
                                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                                    Hapus ({selectedIds.size})
                                </Button>

                                <Button variant="ghost" size="sm" onClick={clearSelection} disabled={bulkLoading}>
                                    <X className="w-3.5 h-3.5 mr-1" /> Batal
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {selectedResultPackId && (
                <Card>
                    <CardContent className="px-4 pb-4 pt-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40px]">
                                        <Checkbox
                                            checked={filteredResults.length > 0 && selectedIds.size === filteredResults.length}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>No</TableHead>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Full Name</TableHead>
                                    <TableHead>No Absen</TableHead>
                                    <TableHead>Class</TableHead>
                                    <TableHead>Var</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Flags</TableHead>
                                    <TableHead className="text-right">Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredResults
                                    .sort((a, b) => {
                                        const dir = resultSortDir === 'asc' ? 1 : -1;
                                        const studentA = users.find(u => u.username === a.username);
                                        const studentB = users.find(u => u.username === b.username);
                                        switch (resultSortBy) {
                                            case 'name': {
                                                const nameA = (studentA?.fullName || a.username).toLowerCase();
                                                const nameB = (studentB?.fullName || b.username).toLowerCase();
                                                return nameA.localeCompare(nameB) * dir;
                                            }
                                            case 'absen': {
                                                const absenA = parseInt(studentA?.absentNumber || '999') || 999;
                                                const absenB = parseInt(studentB?.absentNumber || '999') || 999;
                                                return (absenA - absenB) * dir;
                                            }
                                            case 'class': {
                                                const classA = (classes.find(c => c.id === studentA?.classId)?.name || '').toLowerCase();
                                                const classB = (classes.find(c => c.id === studentB?.classId)?.name || '').toLowerCase();
                                                const cmp = classA.localeCompare(classB);
                                                if (cmp !== 0) return cmp * dir;
                                                const aA = parseInt(studentA?.absentNumber || '999') || 999;
                                                const aB = parseInt(studentB?.absentNumber || '999') || 999;
                                                return (aA - aB) * dir;
                                            }
                                            case 'time':
                                            default: {
                                                const timeA = safariSafeDate(a.timestamp).getTime();
                                                const timeB = safariSafeDate(b.timestamp).getTime();
                                                return (timeA - timeB) * dir;
                                            }
                                        }
                                    })
                                    .map((r, idx) => {
                                        const student = users.find(u => u.username === r.username);
                                        const className = classes.find(c => c.id === student?.classId)?.name || 'Unknown';
                                        const isLatest = latestResultIdPerUser.get(r.userId) === r.id;
                                        const retakeStatus = isLatest ? getRetakeStatus(r.userId) : null;
                                        const attemptNum = attemptMap.get(r.id) || 1;

                                        return (
                                            <TableRow key={r.id} className={attemptNum > 1 ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedIds.has(r.id)}
                                                        onCheckedChange={() => toggleSelect(r.id)}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                                                <TableCell>
                                                    <span className="font-bold">{r.username}</span>
                                                    {attemptNum > 1 && (
                                                        <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0 text-amber-600 border-amber-300 bg-amber-50">
                                                            Retake #{attemptNum - 1}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{student?.fullName || '-'}</TableCell>
                                                <TableCell className="font-mono text-muted-foreground">{student?.absentNumber || '-'}</TableCell>
                                                <TableCell className="text-muted-foreground">{className}</TableCell>
                                                <TableCell className="font-mono">{r.variant || 'A'}</TableCell>
                                                <TableCell>
                                                    <Badge variant={r.score >= 75 ? "default" : "destructive"}>
                                                        {Number(r.score).toFixed(2)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{r.cheatCount > 0 ? `${r.cheatCount} Flags` : '-'}</TableCell>
                                                <TableCell className="text-right text-xs text-muted-foreground">
                                                    {safariSafeDate(r.timestamp).toLocaleString()}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="inline-flex items-center gap-1">
                                                        {/* Retake icon — only on latest result per user */}
                                                        {isLatest && retakeStatus === 'idle' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-muted-foreground hover:text-amber-500"
                                                                onClick={async () => {
                                                                    if (confirm(`Izinkan ${r.username} untuk mengerjakan ujian ulang?`)) {
                                                                        await resetUserAttempts(r.userId, selectedResultPackId);
                                                                        refreshData();
                                                                    }
                                                                }}
                                                                title="Izinkan Retake"
                                                            >
                                                                <RotateCcw className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        {isLatest && retakeStatus === 'waiting' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-amber-500 cursor-default"
                                                                title="Menunggu siswa mengerjakan retake"
                                                            >
                                                                <RotateCcw className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
                                                            </Button>
                                                        )}
                                                        {isLatest && retakeStatus === 'in-exam' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="text-blue-500 cursor-default"
                                                                title="Siswa sedang mengerjakan ujian"
                                                            >
                                                                <RotateCcw className="w-4 h-4 animate-pulse" />
                                                            </Button>
                                                        )}

                                                        {/* Delete button */}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-muted-foreground hover:text-destructive"
                                                            onClick={async () => {
                                                                if (confirm(`Hapus result ${r.username} (Score: ${Number(r.score).toFixed(2)})?`)) {
                                                                    await onDeleteResult(r.id);
                                                                }
                                                            }}
                                                            title="Hapus Result"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                {filteredResults.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={11} className="text-center py-12 text-muted-foreground italic">
                                            {packResults.length === 0 ? 'No results found for this exam pack.' : 'Tidak ada hasil untuk kelas ini.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {selectedResultPackId && (() => {
                const selectedPack = packs.find(p => p.id === selectedResultPackId);
                if (!selectedPack) return null;
                const allowedClassIds = Array.isArray(selectedPack.allowedClassIds)
                    ? selectedPack.allowedClassIds as string[]
                    : (typeof selectedPack.allowedClassIds === 'string' ? JSON.parse(selectedPack.allowedClassIds || '[]') : []);
                const takenUserIds = new Set(packResults.map(r => r.userId));
                return (
                    <MissingStudents
                        users={users}
                        classes={classes}
                        allowedClassIds={allowedClassIds}
                        takenUserIds={takenUserIds}
                        variant="results"
                    />
                );
            })()}
        </div>
    );
};
