'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trash2, Plus, Edit2, X, Upload, GripVertical, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    getLoginSlides,
    createLoginSlide,
    updateLoginSlide,
    deleteLoginSlide,
} from '@/app/actions/admin';

interface Slide {
    id: string;
    title?: string | null;
    description?: string | null;
    imageUrl: string;
    order: number;
    isActive: boolean;
}

const emptyForm = { title: '', description: '', imageUrl: '', order: 0, isActive: true };

export function LoginSlidesManagement() {
    const [slides, setSlides] = useState<Slide[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [form, setForm] = useState<typeof emptyForm>(emptyForm);
    const [showForm, setShowForm] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const fetchSlides = async () => {
        setLoading(true);
        try {
            const data = await getLoginSlides();
            setSlides(data as any);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSlides(); }, []);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.url) setForm(prev => ({ ...prev, imageUrl: data.url }));
            else alert('Upload failed: ' + (data.error || 'Unknown error'));
        } catch {
            alert('Upload failed');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    const handleSave = async () => {
        if (!form.imageUrl) { alert('Pilih gambar terlebih dahulu'); return; }
        setSaving(true);
        try {
            if (editingId) {
                await updateLoginSlide({ id: editingId, ...form });
            } else {
                await createLoginSlide(form);
            }
            resetForm();
            fetchSlides();
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (slide: Slide) => {
        setEditingId(slide.id);
        setForm({
            title: slide.title || '',
            description: slide.description || '',
            imageUrl: slide.imageUrl,
            order: slide.order,
            isActive: slide.isActive,
        });
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Hapus slide ini?')) return;
        await deleteLoginSlide(id);
        fetchSlides();
    };

    const handleToggleActive = async (slide: Slide) => {
        await updateLoginSlide({ id: slide.id, isActive: !slide.isActive });
        fetchSlides();
    };

    const resetForm = () => {
        setEditingId(null);
        setForm(emptyForm);
        setShowForm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-semibold">Pengaturan Slider Login</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Kelola gambar dan pengumuman yang tampil di halaman login (sisi kanan). Slide aktif akan berganti otomatis setiap 5 detik.
                    </p>
                </div>
                <Button onClick={() => { resetForm(); setShowForm(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Slide
                </Button>
            </div>

            {/* Form Tambah/Edit */}
            {showForm && (
                <Card className="border-2 border-primary/30">
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{editingId ? 'Edit Slide' : 'Slide Baru'}</h3>
                            <Button variant="ghost" size="icon" onClick={resetForm}><X className="w-4 h-4" /></Button>
                        </div>

                        {/* Image Upload */}
                        <div className="space-y-2">
                            <Label>Gambar *</Label>
                            <div className="flex gap-3 items-start">
                                {form.imageUrl && (
                                    <div className="relative w-32 h-20 rounded overflow-hidden border flex-shrink-0">
                                        <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, imageUrl: '' }))}
                                            className="absolute top-1 right-1 bg-black/60 text-white rounded p-0.5"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}
                                <div className="flex flex-col gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileRef.current?.click()}
                                        disabled={uploading}
                                    >
                                        {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                        {uploading ? 'Mengunggah...' : 'Upload Gambar'}
                                    </Button>
                                    <p className="text-xs text-muted-foreground">JPG, PNG, WebP – maks 5MB</p>
                                </div>
                            </div>
                            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <Label>Judul (opsional)</Label>
                                <Input
                                    value={form.title}
                                    onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Contoh: Ujian Nasional 2025"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Urutan</Label>
                                <Input
                                    type="number"
                                    value={form.order}
                                    onChange={e => setForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label>Deskripsi / Pengumuman (opsional)</Label>
                            <textarea
                                value={form.description}
                                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Contoh: Ujian berlangsung 14–16 Maret 2025. Hadir tepat waktu!"
                                rows={3}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <Switch
                                checked={form.isActive}
                                onCheckedChange={v => setForm(prev => ({ ...prev, isActive: v }))}
                            />
                            <Label>Aktifkan slide ini</Label>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button onClick={handleSave} disabled={saving || !form.imageUrl}>
                                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {editingId ? 'Simpan Perubahan' : 'Tambah Slide'}
                            </Button>
                            <Button variant="outline" onClick={resetForm}>Batal</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Slide List */}
            {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    Memuat slides...
                </div>
            ) : slides.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p className="font-medium">Belum ada slide</p>
                    <p className="text-sm mt-1">Tambah slide pertama untuk mengganti gambar di halaman login</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {slides.map((slide, idx) => (
                        <Card key={slide.id} className={`overflow-hidden ${!slide.isActive ? 'opacity-60' : ''}`}>
                            <CardContent className="p-0">
                                <div className="flex items-center gap-4 p-4">
                                    {/* Thumbnail */}
                                    <div className="w-24 h-16 rounded overflow-hidden flex-shrink-0 bg-muted">
                                        <img src={slide.imageUrl} alt={slide.title || `Slide ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-medium truncate">{slide.title || <span className="text-muted-foreground italic">Tanpa judul</span>}</p>
                                            <Badge variant={slide.isActive ? 'default' : 'secondary'}>
                                                {slide.isActive ? 'Aktif' : 'Non-aktif'}
                                            </Badge>
                                            <Badge variant="outline" className="text-xs">Urutan: {slide.order}</Badge>
                                        </div>
                                        {slide.description && (
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{slide.description}</p>
                                        )}
                                    </div>
                                    {/* Actions */}
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            title={slide.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                            onClick={() => handleToggleActive(slide)}
                                        >
                                            {slide.isActive
                                                ? <ToggleRight className="w-5 h-5 text-primary" />
                                                : <ToggleLeft className="w-5 h-5 text-muted-foreground" />
                                            }
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(slide)}>
                                            <Edit2 className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-destructive hover:text-destructive"
                                            onClick={() => handleDelete(slide.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {slides.length > 0 && (
                <p className="text-xs text-muted-foreground">
                    💡 Tip: Hanya slide yang <strong>Aktif</strong> yang akan tampil di halaman login. Gunakan kolom <strong>Urutan</strong> untuk mengatur urutan tampil slide.
                </p>
            )}
        </div>
    );
}
