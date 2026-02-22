'use client';

import React, { useState, useEffect } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { CalendarIcon, Clock, X, Check } from 'lucide-react';

interface DateTimePickerProps {
    value?: string; // ISO string or datetime-local format "YYYY-MM-DDTHH:mm"
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
}

function parseDateTimeValue(value: string | undefined): { date: Date | undefined; hours: string; minutes: string } {
    if (!value) return { date: undefined, hours: '08', minutes: '00' };
    try {
        const d = new Date(value.replace(' ', 'T'));
        if (isNaN(d.getTime())) return { date: undefined, hours: '08', minutes: '00' };
        return {
            date: d,
            hours: String(d.getHours()).padStart(2, '0'),
            minutes: String(d.getMinutes()).padStart(2, '0'),
        };
    } catch {
        return { date: undefined, hours: '08', minutes: '00' };
    }
}

function formatDisplay(value: string | undefined): string {
    if (!value) return '';
    try {
        const d = new Date(value.replace(' ', 'T'));
        if (isNaN(d.getTime())) return '';
        return d.toLocaleString('id-ID', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '';
    }
}

export function DateTimePicker({ value, onChange, placeholder = 'Pilih tanggal & waktu', className }: DateTimePickerProps) {
    const [open, setOpen] = useState(false);
    const parsed = parseDateTimeValue(value);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(parsed.date);
    const [hours, setHours] = useState(parsed.hours);
    const [minutes, setMinutes] = useState(parsed.minutes);

    // Sync internal state when external value changes
    useEffect(() => {
        const p = parseDateTimeValue(value);
        setSelectedDate(p.date);
        setHours(p.hours);
        setMinutes(p.minutes);
    }, [value]);

    const handleConfirm = () => {
        if (!selectedDate) return;
        const d = new Date(selectedDate);
        d.setHours(parseInt(hours) || 0, parseInt(minutes) || 0, 0, 0);

        // Format as YYYY-MM-DDTHH:mm for datetime-local compatibility
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        onChange(`${year}-${month}-${day}T${h}:${m}`);
        setOpen(false);
    };

    const handleClear = () => {
        onChange('');
        setSelectedDate(undefined);
        setHours('08');
        setMinutes('00');
        setOpen(false);
    };

    const displayValue = formatDisplay(value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        'w-full justify-start text-left font-normal h-9',
                        !displayValue && 'text-muted-foreground',
                        className
                    )}
                >
                    <CalendarIcon className="w-4 h-4 mr-2 shrink-0" />
                    {displayValue || placeholder}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 space-y-3">
                    <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                    />

                    <Separator />

                    {/* Time picker */}
                    <div className="space-y-2">
                        <Label className="text-xs flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" /> Waktu
                        </Label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                min={0}
                                max={23}
                                value={hours}
                                onChange={e => {
                                    let v = parseInt(e.target.value);
                                    if (isNaN(v)) v = 0;
                                    if (v > 23) v = 23;
                                    if (v < 0) v = 0;
                                    setHours(String(v).padStart(2, '0'));
                                }}
                                className="w-16 text-center font-mono text-lg"
                            />
                            <span className="text-xl font-bold text-muted-foreground">:</span>
                            <Input
                                type="number"
                                min={0}
                                max={59}
                                value={minutes}
                                onChange={e => {
                                    let v = parseInt(e.target.value);
                                    if (isNaN(v)) v = 0;
                                    if (v > 59) v = 59;
                                    if (v < 0) v = 0;
                                    setMinutes(String(v).padStart(2, '0'));
                                }}
                                className="w-16 text-center font-mono text-lg"
                            />
                        </div>
                    </div>

                    <Separator />

                    {/* Action buttons */}
                    <div className="flex gap-2">
                        {value && (
                            <Button variant="outline" size="sm" className="flex-1" onClick={handleClear}>
                                <X className="w-3.5 h-3.5 mr-1.5" /> Hapus
                            </Button>
                        )}
                        <Button
                            size="sm"
                            className="flex-1"
                            onClick={handleConfirm}
                            disabled={!selectedDate}
                        >
                            <Check className="w-3.5 h-3.5 mr-1.5" /> Set
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
