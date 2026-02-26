'use client';

import React from 'react';
import { ClassGroup } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

interface ClassManagementProps {
    classes: ClassGroup[];
    newClassName: string;
    setNewClassName: (v: string) => void;
    handleCreateClass: () => void;
    handleDeleteClass: (id: string) => void;
}

export const ClassManagement: React.FC<ClassManagementProps> = ({
    classes, newClassName, setNewClassName, handleCreateClass, handleDeleteClass
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
                            <Badge key={c.id} variant="secondary" className="flex items-center gap-2 px-3 py-1.5">
                                {c.name}
                                <Button variant="ghost" size="icon" className="h-4 w-4 p-0 hover:text-destructive" onClick={() => handleDeleteClass(c.id)}>
                                    <X className="w-3 h-3" />
                                </Button>
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
