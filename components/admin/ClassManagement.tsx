'use client';

import React from 'react';
import { ClassGroup } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Pencil, Check } from 'lucide-react';

interface ClassManagementProps {
    classes: ClassGroup[];
    newClassName: string;
    setNewClassName: (v: string) => void;
    handleCreateClass: () => void;
    handleDeleteClass: (id: string) => void;
    editingClassId: string | null;
    editClassName: string;
    setEditClassName: (v: string) => void;
    handleStartEditClass: (cls: ClassGroup) => void;
    handleSaveEditClass: () => void;
    handleCancelEditClass: () => void;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({
    classes, newClassName, setNewClassName, handleCreateClass, handleDeleteClass,
    editingClassId, editClassName, setEditClassName, handleStartEditClass, handleSaveEditClass, handleCancelEditClass
}) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Buat Kelas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-2">
                        <Input
                            value={newClassName}
                            onChange={(e) => setNewClassName(e.target.value)}
                            placeholder="Cth. 12 IPA 2"
                        />
                        <Button onClick={handleCreateClass}>Tambah</Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Daftar Kelas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap gap-2">
                        {classes.map(c => (
                            <div key={c.id}>
                                {editingClassId === c.id ? (
                                    <div className="flex items-center gap-2 border rounded-full px-3 py-1 bg-secondary text-secondary-foreground">
                                        <Input
                                            value={editClassName}
                                            onChange={(e) => setEditClassName(e.target.value)}
                                            className="h-6 text-sm w-32 px-2"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSaveEditClass();
                                                if (e.key === 'Escape') handleCancelEditClass();
                                            }}
                                        />
                                        <Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:text-green-500" onClick={handleSaveEditClass}>
                                            <Check className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 p-0 hover:text-destructive" onClick={handleCancelEditClass}>
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <Badge variant="secondary" className="flex items-center gap-2 px-3 py-1.5">
                                        {c.name}
                                        <Button variant="ghost" size="icon" className="h-4 w-4 p-0 ml-1 hover:text-primary" onClick={() => handleStartEditClass(c)}>
                                            <Pencil className="w-3 h-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:text-destructive" onClick={() => handleDeleteClass(c.id)}>
                                            <X className="w-3 h-3" />
                                        </Button>
                                    </Badge>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
