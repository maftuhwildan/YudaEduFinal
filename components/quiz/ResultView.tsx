'use client';

import React from 'react';
import { CheckCircle2, Clock, LogOut } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ResultViewProps {
    reason?: 'submitted' | 'expired';
    onLogout: () => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ reason = 'submitted', onLogout }) => {
    const isExpired = reason === 'expired';

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="max-w-md w-full text-center">
                <CardHeader className="pb-2">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isExpired ? 'bg-amber-100 dark:bg-amber-950' : 'bg-green-100 dark:bg-green-950'}`}>
                        {isExpired
                            ? <Clock className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                            : <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                        }
                    </div>
                    <CardTitle className="text-2xl">
                        {isExpired ? 'Waktu Ujian Telah Habis' : 'Exam Submitted'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        {isExpired
                            ? 'Waktu ujian Anda telah berakhir saat offline. Jawaban Anda telah otomatis tersimpan dan dikumpulkan.'
                            : 'Your result has been saved successfully.'
                        }
                    </p>
                    <Button onClick={onLogout} variant="outline" className="w-full">
                        <LogOut className="w-4 h-4 mr-2" /> Logout
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};
