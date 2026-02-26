'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { User, ClassGroup } from '@/types';
import { Role } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, Upload, UserPlus, Trash2, Search, Users, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserManagementProps {
    users: User[];
    classes: ClassGroup[];
    showUserModal: boolean;
    setShowUserModal: (v: boolean) => void;
    userForm: { fullName: string; username: string; password: string; classId: string; absentNumber: string };
    setUserForm: (v: any) => void;
    handleDeleteUser: (id: string) => void;
    handleBulkDeleteUsers: (ids: string[]) => void;
    handleSaveManualUser: () => void;
    handleDownloadTemplate: () => void;
    handleImportStudents: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    isImporting: boolean;
    importProgress: { current: number; total: number };
}

export const UserManagement: React.FC<UserManagementProps> = ({
    users, classes, showUserModal, setShowUserModal, userForm, setUserForm,
    handleDeleteUser, handleBulkDeleteUsers, handleSaveManualUser, handleDownloadTemplate, handleImportStudents, fileInputRef,
    isImporting, importProgress
}) => {
    const [selectedClassId, setSelectedClassId] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);

    // Clear selection when filter/search changes
    useEffect(() => {
        setSelectedIds(new Set());
    }, [selectedClassId, searchQuery]);

    // Get only student users
    const studentUsers = useMemo(() =>
        users.filter(u => u.role === Role.USER),
        [users]
    );

    // Count students per class
    const classStudentCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        studentUsers.forEach(u => {
            const key = u.classId || 'UNASSIGNED';
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }, [studentUsers]);

    // Filter & sort students
    const filteredStudents = useMemo(() => {
        let filtered = studentUsers;

        // Class filter
        if (selectedClassId !== 'ALL') {
            if (selectedClassId === 'UNASSIGNED') {
                filtered = filtered.filter(u => !u.classId);
            } else {
                filtered = filtered.filter(u => u.classId === selectedClassId);
            }
        }

        // Search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(u =>
                (u.fullName || '').toLowerCase().includes(q) ||
                u.username.toLowerCase().includes(q) ||
                (u.absentNumber || '').toLowerCase().includes(q)
            );
        }

        // Sort by class name, then by absent number (numeric)
        filtered.sort((a, b) => {
            const classA = classes.find(c => c.id === a.classId)?.name || 'zzz';
            const classB = classes.find(c => c.id === b.classId)?.name || 'zzz';
            if (classA !== classB) return classA.localeCompare(classB);

            const numA = parseInt(a.absentNumber || '999', 10);
            const numB = parseInt(b.absentNumber || '999', 10);
            return numA - numB;
        });

        return filtered;
    }, [studentUsers, selectedClassId, searchQuery, classes]);

    const importPercentage = importProgress.total > 0
        ? Math.round((importProgress.current / importProgress.total) * 100)
        : 0;

    // Check if there are unassigned students
    const hasUnassigned = studentUsers.some(u => !u.classId);

    // Bulk selection helpers
    const isAllSelected = filteredStudents.length > 0 && filteredStudents.every(u => selectedIds.has(u.id));
    const isSomeSelected = filteredStudents.some(u => selectedIds.has(u.id));

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredStudents.map(u => u.id)));
        }
    };

    const toggleSelectOne = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const handleBulkDelete = async () => {
        const ids = Array.from(selectedIds);
        setIsBulkDeleting(true);
        await handleBulkDeleteUsers(ids);
        setSelectedIds(new Set());
        setIsBulkDeleting(false);
    };

    return (
        <>
            <div className="space-y-6">
                <Card>
                    <CardHeader className="flex flex-col gap-4">
                        {/* Title row */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    Manajemen Siswa
                                    <Badge variant="secondary" className="text-xs font-normal">
                                        {studentUsers.length} siswa
                                    </Badge>
                                </CardTitle>
                                <CardDescription>Impor daftar siswa via Excel atau tambah manual.</CardDescription>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <input type="file" accept=".xlsx,.xls" ref={fileInputRef} onChange={handleImportStudents} className="hidden" />
                                <Button variant="outline" onClick={handleDownloadTemplate} disabled={isImporting}>
                                    <Download className="w-4 h-4 mr-2" /> Unduh Templat
                                </Button>
                                <Button
                                    variant={isImporting ? "default" : "outline"}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isImporting}
                                    className={`relative transition-all duration-300 ${isImporting
                                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                                        : 'hover:bg-primary/10 hover:text-primary hover:border-primary'
                                        }`}
                                >
                                    {isImporting ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Upload className="w-4 h-4 mr-2" />
                                    )}
                                    {isImporting ? 'Mengimpor...' : 'Impor Excel'}
                                </Button>
                                <Button onClick={() => setShowUserModal(true)} disabled={isImporting}>
                                    <UserPlus className="w-4 h-4 mr-2" /> Tambah Siswa
                                </Button>
                            </div>
                        </div>

                        {/* Import Progress Overlay */}
                        <AnimatePresence>
                            {isImporting && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="overflow-hidden"
                                >
                                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <div className="flex items-center gap-2">
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                >
                                                    <Loader2 className="w-4 h-4 text-primary" />
                                                </motion.div>
                                                <span className="font-medium text-primary">Mengimpor data siswa...</span>
                                            </div>
                                            <span className="text-muted-foreground font-mono">
                                                {importProgress.current} / {importProgress.total}
                                            </span>
                                        </div>
                                        <Progress value={importPercentage} className="h-2" />
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs text-muted-foreground">
                                                Mohon tunggu, jangan tutup halaman ini
                                            </p>
                                            <span className="text-xs font-semibold text-primary">
                                                {importPercentage}%
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Class filter + Search */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Search */}
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Cari nama atau username..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Class filter buttons */}
                        <ScrollArea className="w-full">
                            <div className="flex gap-2 pb-1">
                                <Button
                                    variant={selectedClassId === 'ALL' ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => setSelectedClassId('ALL')}
                                    className="shrink-0 transition-all duration-200"
                                >
                                    <Users className="w-3.5 h-3.5 mr-1.5" />
                                    Semua Kelas
                                    <Badge variant={selectedClassId === 'ALL' ? 'secondary' : 'outline'} className="ml-2 text-[10px] px-1.5 py-0">
                                        {studentUsers.length}
                                    </Badge>
                                </Button>
                                {classes.map(cls => (
                                    <Button
                                        key={cls.id}
                                        variant={selectedClassId === cls.id ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSelectedClassId(cls.id)}
                                        className="shrink-0 transition-all duration-200"
                                    >
                                        {cls.name}
                                        <Badge
                                            variant={selectedClassId === cls.id ? 'secondary' : 'outline'}
                                            className="ml-2 text-[10px] px-1.5 py-0"
                                        >
                                            {classStudentCounts[cls.id] || 0}
                                        </Badge>
                                    </Button>
                                ))}
                                {hasUnassigned && (
                                    <Button
                                        variant={selectedClassId === 'UNASSIGNED' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setSelectedClassId('UNASSIGNED')}
                                        className="shrink-0 transition-all duration-200"
                                    >
                                        Tanpa Kelas
                                        <Badge
                                            variant={selectedClassId === 'UNASSIGNED' ? 'secondary' : 'outline'}
                                            className="ml-2 text-[10px] px-1.5 py-0"
                                        >
                                            {classStudentCounts['UNASSIGNED'] || 0}
                                        </Badge>
                                    </Button>
                                )}
                            </div>
                        </ScrollArea>
                    </CardHeader>

                    <CardContent className="px-4 pb-4 pt-0">
                        {filteredStudents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                    <Users className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <p className="text-lg font-medium text-muted-foreground">
                                    {searchQuery ? 'Tidak ada siswa yang cocok' : 'Belum ada siswa'}
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {searchQuery
                                        ? `Tidak ditemukan hasil untuk "${searchQuery}"`
                                        : 'Import dari Excel atau tambahkan siswa secara manual'}
                                </p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-10 text-center">
                                            <Checkbox
                                                checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                                                onCheckedChange={toggleSelectAll}
                                                aria-label="Pilih semua"
                                            />
                                        </TableHead>
                                        <TableHead className="w-12 text-center">No</TableHead>
                                        <TableHead className="w-20">No Absen</TableHead>
                                        <TableHead>Nama Lengkap</TableHead>
                                        <TableHead>Username</TableHead>
                                        {selectedClassId === 'ALL' && <TableHead>Kelas</TableHead>}
                                        <TableHead>Kata Sandi</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <AnimatePresence>
                                        {filteredStudents.map((u, idx) => (
                                            <motion.tr
                                                key={u.id}
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -20 }}
                                                transition={{ duration: 0.15, delay: idx * 0.02 }}
                                                className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${selectedIds.has(u.id) ? 'bg-primary/5' : ''}`}
                                            >
                                                <TableCell className="text-center">
                                                    <Checkbox
                                                        checked={selectedIds.has(u.id)}
                                                        onCheckedChange={() => toggleSelectOne(u.id)}
                                                        aria-label={`Select ${u.fullName || u.username}`}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center text-muted-foreground text-xs">
                                                    {idx + 1}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground font-mono text-sm">
                                                    {u.absentNumber || '-'}
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {u.fullName || u.username}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {u.username}
                                                </TableCell>
                                                {selectedClassId === 'ALL' && (
                                                    <TableCell>
                                                        {u.classId ? (
                                                            <Badge variant="outline" className="font-normal">
                                                                {classes.find(c => c.id === u.classId)?.name || '-'}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground text-xs italic">Tanpa Kelas</span>
                                                        )}
                                                    </TableCell>
                                                )}
                                                <TableCell className="font-mono text-muted-foreground">*****</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="hover:text-destructive hover:bg-destructive/10 transition-colors" onClick={() => handleDeleteUser(u.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </motion.tr>
                                        ))}
                                    </AnimatePresence>
                                </TableBody>
                            </Table>
                        )}

                        {/* Filtered count summary */}
                        {filteredStudents.length > 0 && (
                            <div className="px-6 py-3 border-t bg-muted/30 text-xs text-muted-foreground flex justify-between items-center">
                                <span>
                                    Menampilkan {filteredStudents.length} dari {studentUsers.length} siswa
                                    {selectedClassId !== 'ALL' && (
                                        <span className="ml-1">
                                            — Kelas: <strong>{selectedClassId === 'UNASSIGNED' ? 'Tanpa Kelas' : classes.find(c => c.id === selectedClassId)?.name}</strong>
                                        </span>
                                    )}
                                </span>
                                {searchQuery && (
                                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setSearchQuery('')}>
                                        Hapus pencarian
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Bulk Action Bar */}
                <AnimatePresence>
                    {selectedIds.size > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
                        >
                            <div className="flex items-center gap-3 bg-card border shadow-xl rounded-lg px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="text-sm font-bold text-primary">{selectedIds.size}</span>
                                    </div>
                                    <span className="text-sm font-medium">siswa dipilih</span>
                                </div>
                                <Separator orientation="vertical" className="h-8" />
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={handleBulkDelete}
                                    disabled={isBulkDeleting}
                                    className="gap-2"
                                >
                                    {isBulkDeleting ? (
                                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                                            <Trash2 className="w-4 h-4" />
                                        </motion.div>
                                    ) : (
                                        <Trash2 className="w-4 h-4" />
                                    )}
                                    {isBulkDeleting ? 'Menghapus...' : 'Hapus Terpilih'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setSelectedIds(new Set())}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Add User Dialog */}
            <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Tambah Siswa Baru</DialogTitle>
                        <DialogDescription>Masukkan detail siswa di bawah ini.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Nama Lengkap</Label>
                            <Input value={userForm.fullName} onChange={e => setUserForm({ ...userForm, fullName: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Kelas</Label>
                                <Select value={userForm.classId} onValueChange={v => setUserForm({ ...userForm, classId: v })}>
                                    <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                                    <SelectContent>
                                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>No Absen</Label>
                                <Input value={userForm.absentNumber} onChange={e => setUserForm({ ...userForm, absentNumber: e.target.value })} />
                            </div>
                        </div>
                        <Separator />
                        <p className="text-xs text-primary font-bold">Kredensial Akses</p>
                        <div className="space-y-2">
                            <Label>Username / NIS</Label>
                            <Input value={userForm.username} onChange={e => setUserForm({ ...userForm, username: e.target.value })} className="font-mono" />
                        </div>
                        <div className="space-y-2">
                            <Label>Kata Sandi</Label>
                            <Input value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="font-mono" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSaveManualUser} className="w-full">Simpan Siswa</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
