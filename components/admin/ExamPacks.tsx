'use client';

import React, { useState } from 'react';
import { QuizPack, ClassGroup } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dices, Key, Clock, Calendar, School, BookOpen, Copy, Trash2, Download, Loader2, CheckCircle2, Edit2, X } from 'lucide-react';

// Safari-safe date parsing
function safariSafeDate(value: any): Date {
    if (!value) return new Date();
    if (value instanceof Date) return value;
    const str = String(value);
    return new Date(str.replace(' ', 'T'));
}

interface ExamPacksProps {
    packs: QuizPack[];
    classes: ClassGroup[];
    packForm: Partial<QuizPack>;
    setPackForm: (v: any) => void;
    handleSavePack: () => void;
    handleDeletePack: (id: string) => void;
    handleToggleActive: (pack: QuizPack) => void;
    handleDuplicatePack: (pack: QuizPack) => void;
    handleImportQuestionsFromPack: (targetPackId: string, sourcePackId: string) => Promise<{ success: boolean; count: number }>;
    handleGenerateToken: () => void;
    toggleClassForPack: (classId: string) => void;
    handleCancelEdit: () => void;
}

export const ExamPacks: React.FC<ExamPacksProps> = ({
    packs, classes, packForm, setPackForm, handleSavePack, handleDeletePack,
    handleToggleActive, handleDuplicatePack, handleImportQuestionsFromPack, handleGenerateToken, toggleClassForPack, handleCancelEdit
}) => {
    const [importTargetPackId, setImportTargetPackId] = useState<string | null>(null);
    const [importSourcePackId, setImportSourcePackId] = useState<string>('');
    const [isImportingQuestions, setIsImportingQuestions] = useState(false);
    const [importResult, setImportResult] = useState<{ success: boolean; count: number } | null>(null);

    const openImportDialog = (packId: string) => {
        setImportTargetPackId(packId);
        setImportSourcePackId('');
        setImportResult(null);
    };

    const doImport = async () => {
        if (!importTargetPackId || !importSourcePackId) return;
        setIsImportingQuestions(true);
        const result = await handleImportQuestionsFromPack(importTargetPackId, importSourcePackId);
        setImportResult(result);
        setIsImportingQuestions(false);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="h-fit">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Dices className="w-5 h-5 text-primary" />
                        {packForm.id ? 'Edit Ujian' : 'Konfigurasi Ujian'}
                    </CardTitle>
                    {packForm.id && (
                        <CardDescription>Mengedit: <strong>{packForm.name}</strong></CardDescription>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nama Ujian</Label>
                        <Input value={packForm.name} onChange={e => setPackForm({ ...packForm, name: e.target.value })} placeholder="Cth. Ujian Akhir Semester" />
                    </div>

                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <Label>Waktu (Menit)</Label>
                            <Input type="number" value={packForm.timeLimit} onChange={e => setPackForm({ ...packForm, timeLimit: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label>Token Awal</Label>
                            <div className="flex gap-2">
                                <Input value={packForm.token} onChange={e => setPackForm({ ...packForm, token: e.target.value.toUpperCase() })} placeholder="SECRET" className="uppercase font-mono tracking-wider" />
                                <Button variant="outline" size="icon" onClick={handleGenerateToken} title="Acak Token">
                                    <Key className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Waktu Mulai (Opsional)</Label>
                        <DateTimePicker
                            value={packForm.scheduleStart || ''}
                            onChange={v => setPackForm({ ...packForm, scheduleStart: v })}
                            placeholder="Pilih waktu mulai"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Waktu Selesai (Opsional)</Label>
                        <DateTimePicker
                            value={packForm.scheduleEnd || ''}
                            onChange={v => setPackForm({ ...packForm, scheduleEnd: v })}
                            placeholder="Pilih waktu selesai"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Pilih Kelas</Label>
                        <div className="max-h-32 overflow-y-auto border rounded-md p-2 space-y-1">
                            {classes.map(c => (
                                <div key={c.id} className="flex items-center gap-2 p-1 hover:bg-muted rounded">
                                    <Checkbox
                                        id={`class-${c.id}`}
                                        checked={(packForm.allowedClassIds || []).includes(c.id)}
                                        onCheckedChange={() => toggleClassForPack(c.id)}
                                    />
                                    <Label htmlFor={`class-${c.id}`} className="text-sm cursor-pointer font-normal">{c.name}</Label>
                                </div>
                            ))}
                            {classes.length === 0 && <p className="text-xs text-muted-foreground p-1">Tidak ada kelas tersedia.</p>}
                        </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs">Rotasi Token Otomatis (Tiap 5m)</Label>
                            <Switch checked={packForm.autoRotateToken} onCheckedChange={c => setPackForm({ ...packForm, autoRotateToken: c })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-xs">Acak Urutan Soal</Label>
                            <Switch checked={packForm.randomizeQuestions} onCheckedChange={c => setPackForm({ ...packForm, randomizeQuestions: c })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-xs">Acak Pilihan Jawaban</Label>
                            <Switch checked={packForm.randomizeOptions} onCheckedChange={c => setPackForm({ ...packForm, randomizeOptions: c })} />
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={handleSavePack} className="flex-1">
                            {packForm.id ? 'Perbarui Ujian' : 'Buat Ujian'}
                        </Button>
                        {packForm.id && (
                            <Button variant="outline" onClick={handleCancelEdit}>
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <div className="lg:col-span-2 space-y-4">
                {packs.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="text-center py-12">
                            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                            <p className="text-muted-foreground">Belum ada ujian yang dibuat.</p>
                        </CardContent>
                    </Card>
                ) : (
                    packs.map(p => (
                        <Card key={p.id} className="relative overflow-hidden group">
                            <div className={`absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 rounded-full opacity-10 ${p.isActive ? 'bg-green-500' : 'bg-muted'}`} />
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>{p.name}</CardTitle>
                                        <CardDescription className="flex flex-wrap items-center gap-4 mt-2">
                                            <span className="flex items-center gap-1">
                                                <Key className="w-3 h-3" /> Token: <code className="font-mono font-bold bg-muted px-1 rounded">{p.token || 'NONE'}</code>
                                                {p.autoRotateToken && <span className="text-[10px] text-orange-500 ml-1">(Auto)</span>}
                                            </span>
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {p.timeLimit} menit</span>
                                            {p.scheduleStart && (<span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {safariSafeDate(p.scheduleStart).toLocaleDateString()}</span>)}
                                            <span className="flex items-center gap-1">
                                                <School className="w-3 h-3" />
                                                {p.allowedClassIds && p.allowedClassIds.length > 0 ? `${(p.allowedClassIds as string[]).length} Kelas` : 'Semua Kelas'}
                                            </span>
                                        </CardDescription>
                                    </div>
                                    <Badge variant={p.isActive ? "default" : "secondary"}>{p.isActive ? 'AKTIF' : 'NONAKTIF'}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Separator className="mb-4" />
                                <div className="flex items-center justify-end gap-2">
                                    <Button variant="outline" size="sm" onClick={() => openImportDialog(p.id)}>
                                        <Download className="w-3 h-3 mr-1" /> Import Soal
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => handleDuplicatePack(p)}>
                                        <Copy className="w-3 h-3 mr-1" /> Duplikat
                                    </Button>
                                    <Button variant="outline" size="sm" onClick={() => {
                                        setPackForm({
                                            id: p.id,
                                            name: p.name,
                                            timeLimit: p.timeLimit,
                                            token: p.token,
                                            allowedClassIds: Array.isArray(p.allowedClassIds) ? [...p.allowedClassIds] : [],
                                            randomizeQuestions: p.randomizeQuestions,
                                            randomizeOptions: p.randomizeOptions,
                                            autoRotateToken: p.autoRotateToken || false,
                                            scheduleStart: p.scheduleStart || '',
                                            scheduleEnd: p.scheduleEnd || '',
                                        });
                                        // Scroll to top of form
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}>
                                        <Edit2 className="w-3 h-3 mr-1" /> Edit
                                    </Button>
                                    <Button variant={p.isActive ? "outline" : "default"} size="sm" onClick={() => handleToggleActive(p)}>
                                        <Key className="w-3 h-3 mr-1" /> {p.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={() => handleDeletePack(p.id)}>
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Import Questions Dialog */}
            <Dialog open={importTargetPackId !== null} onOpenChange={(open) => { if (!open) setImportTargetPackId(null); }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Download className="w-5 h-5 text-primary" />
                            Import Soal dari Pack Lain
                        </DialogTitle>
                        <DialogDescription>
                            Salin soal dari exam pack lain ke <strong>{packs.find(p => p.id === importTargetPackId)?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    {importResult ? (
                        <div className="flex flex-col items-center py-6 gap-3">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-green-600" />
                            </div>
                            <p className="text-sm font-medium">Berhasil mengimpor {importResult.count} soal!</p>
                            <Button onClick={() => setImportTargetPackId(null)} className="mt-2">Selesai</Button>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-3">
                                <Label>Pilih Pack Sumber</Label>
                                <Select value={importSourcePackId} onValueChange={setImportSourcePackId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="-- Pilih exam pack --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {packs
                                            .filter(p => p.id !== importTargetPackId)
                                            .map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                                {packs.filter(p => p.id !== importTargetPackId).length === 0 && (
                                    <p className="text-xs text-muted-foreground italic">Tidak ada pack lain tersedia.</p>
                                )}
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setImportTargetPackId(null)}>Batal</Button>
                                <Button
                                    onClick={doImport}
                                    disabled={!importSourcePackId || isImportingQuestions}
                                >
                                    {isImportingQuestions ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mengimpor...</>
                                    ) : (
                                        <><Download className="w-4 h-4 mr-2" /> Import Soal</>
                                    )}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
