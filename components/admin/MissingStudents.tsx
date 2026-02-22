'use client';

import React, { useState, useMemo } from 'react';
import { User, ClassGroup } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { UserX, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MissingStudentsProps {
    /** All users (students) in the system */
    users: User[];
    /** All class groups */
    classes: ClassGroup[];
    /** Which class IDs are allowed for this pack (empty = all) */
    allowedClassIds: string[];
    /** Set of usernames or userIds who have already taken/started the exam */
    takenUserIds: Set<string>;
    /** Label variant: 'monitoring' shows "Belum Mulai", 'results' shows "Belum Mengerjakan" */
    variant?: 'monitoring' | 'results';
}

export const MissingStudents: React.FC<MissingStudentsProps> = ({
    users, classes, allowedClassIds, takenUserIds, variant = 'results'
}) => {
    const [expanded, setExpanded] = useState(false);
    const [classFilter, setClassFilter] = useState<string>('ALL');

    // Get eligible students (those in allowed classes, excluding admins)
    const eligibleStudents = useMemo(() => {
        return users.filter(u => {
            if ((u as any).role === 'ADMIN') return false;
            if (allowedClassIds.length === 0) return true; // All classes allowed
            return u.classId && allowedClassIds.includes(u.classId);
        });
    }, [users, allowedClassIds]);

    // Missing students = eligible - taken
    const missingStudents = useMemo(() => {
        return eligibleStudents.filter(u => !takenUserIds.has(u.id));
    }, [eligibleStudents, takenUserIds]);

    // Get classes that have missing students
    const missingClasses = useMemo(() => {
        const classIds = new Set<string>();
        missingStudents.forEach(u => {
            if (u.classId) classIds.add(u.classId);
        });
        return classes.filter(c => classIds.has(c.id)).sort((a, b) => a.name.localeCompare(b.name));
    }, [missingStudents, classes]);

    // Filtered missing students by class
    const filteredMissing = useMemo(() => {
        if (classFilter === 'ALL') return missingStudents;
        return missingStudents.filter(u => u.classId === classFilter);
    }, [missingStudents, classFilter]);

    // Sort: by class name, then by absent number
    const sortedMissing = useMemo(() => {
        return [...filteredMissing].sort((a, b) => {
            const classA = (classes.find(c => c.id === a.classId)?.name || '').toLowerCase();
            const classB = (classes.find(c => c.id === b.classId)?.name || '').toLowerCase();
            const classCmp = classA.localeCompare(classB);
            if (classCmp !== 0) return classCmp;
            const absenA = parseInt(a.absentNumber || '999') || 999;
            const absenB = parseInt(b.absentNumber || '999') || 999;
            return absenA - absenB;
        });
    }, [filteredMissing, classes]);

    const title = variant === 'monitoring' ? 'Belum Mulai Ujian' : 'Belum Mengerjakan';

    if (missingStudents.length === 0) return null;

    return (
        <Card>
            <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
                <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                        <UserX className="w-4 h-4 text-orange-500" />
                        <span>{title}</span>
                        <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                            {missingStudents.length} siswa
                        </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </Button>
                </CardTitle>
            </CardHeader>
            {expanded && (
                <CardContent className="pt-0 space-y-3">
                    {/* Class filter */}
                    {missingClasses.length > 1 && (
                        <Select value={classFilter} onValueChange={setClassFilter}>
                            <SelectTrigger className="w-[200px]">
                                <Filter className="w-4 h-4 mr-2 shrink-0" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Semua Kelas ({missingStudents.length})</SelectItem>
                                {missingClasses.map(c => {
                                    const count = missingStudents.filter(u => u.classId === c.id).length;
                                    return <SelectItem key={c.id} value={c.id}>{c.name} ({count})</SelectItem>;
                                })}
                            </SelectContent>
                        </Select>
                    )}

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">No</TableHead>
                                <TableHead>No Absen</TableHead>
                                <TableHead>Nama Lengkap</TableHead>
                                <TableHead>Username</TableHead>
                                <TableHead>Kelas</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sortedMissing.map((u, idx) => (
                                <TableRow key={u.id}>
                                    <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                                    <TableCell className="font-mono">{u.absentNumber || '-'}</TableCell>
                                    <TableCell className="font-medium">{u.fullName || u.username}</TableCell>
                                    <TableCell className="text-muted-foreground font-mono text-sm">{u.username}</TableCell>
                                    <TableCell className="text-muted-foreground">{classes.find(c => c.id === u.classId)?.name || '-'}</TableCell>
                                </TableRow>
                            ))}
                            {sortedMissing.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">
                                        Semua siswa di kelas ini sudah mengerjakan.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            )}
        </Card>
    );
};
