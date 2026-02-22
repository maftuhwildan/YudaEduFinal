'use client';

import React, { useState, useRef } from 'react';
import { SessionUser } from '@/types';
import { updateAdminProfile } from '@/app/actions/auth';
import { Camera, Loader2, Save, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface AdminProfileProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    user: SessionUser;
    onProfileUpdated: (updatedUser: SessionUser) => void;
}

export function AdminProfile({ open, onOpenChange, user, onProfileUpdated }: AdminProfileProps) {
    const [fullName, setFullName] = useState(user.fullName || '');
    const [username, setUsername] = useState(user.username);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [profileImage, setProfileImage] = useState<string | null | undefined>(user.profileImage);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset form when dialog opens
    React.useEffect(() => {
        if (open) {
            setFullName(user.fullName || '');
            setUsername(user.username);
            setProfileImage(user.profileImage);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setError('');
            setSuccess('');
        }
    }, [open, user]);

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setError('Ukuran foto maksimal 2MB');
            return;
        }

        setUploading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            const data = await res.json();
            if (data.url) {
                setProfileImage(data.url);
            } else {
                setError('Upload gagal');
            }
        } catch {
            setError('Upload gagal');
        } finally {
            setUploading(false);
        }
    };

    const handleRemovePhoto = () => {
        setProfileImage(null);
    };

    const handleSave = async () => {
        setError('');
        setSuccess('');

        // Validate password
        if (newPassword && newPassword !== confirmPassword) {
            setError('Konfirmasi password tidak cocok');
            return;
        }

        if (newPassword && newPassword.length < 6) {
            setError('Password baru minimal 6 karakter');
            return;
        }

        if (!username.trim()) {
            setError('Username tidak boleh kosong');
            return;
        }

        setSaving(true);
        try {
            const result = await updateAdminProfile({
                fullName: fullName.trim(),
                username: username.trim(),
                currentPassword: currentPassword || undefined,
                newPassword: newPassword || undefined,
                profileImage: profileImage,
            });

            if (result.error) {
                setError(result.error);
            } else if (result.success && result.user) {
                setSuccess('Profil berhasil diperbarui!');
                onProfileUpdated(result.user as SessionUser);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                // Close dialog after short delay
                setTimeout(() => onOpenChange(false), 1000);
            }
        } catch {
            setError('Gagal menyimpan perubahan');
        } finally {
            setSaving(false);
        }
    };

    const initials = (user.fullName || user.username || '?').charAt(0).toUpperCase();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Profil Admin</DialogTitle>
                    <DialogDescription>
                        Ubah foto profil, nama, username, atau password Anda.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Profile Photo */}
                    <div className="flex flex-col items-center gap-3">
                        <div className="relative group">
                            {profileImage ? (
                                <img
                                    src={profileImage}
                                    alt="Profile"
                                    className="w-24 h-24 rounded-full object-cover border-2 border-border"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold border-2 border-border">
                                    {initials}
                                </div>
                            )}
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                            >
                                {uploading ? (
                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                ) : (
                                    <Camera className="w-6 h-6 text-white" />
                                )}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handlePhotoUpload}
                            />
                        </div>
                        {profileImage && (
                            <button
                                onClick={handleRemovePhoto}
                                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                            >
                                Hapus foto
                            </button>
                        )}
                    </div>

                    {/* Full Name */}
                    <div className="space-y-2">
                        <Label htmlFor="profile-fullname">Nama Lengkap</Label>
                        <Input
                            id="profile-fullname"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Masukkan nama lengkap"
                        />
                    </div>

                    {/* Username */}
                    <div className="space-y-2">
                        <Label htmlFor="profile-username">Username</Label>
                        <Input
                            id="profile-username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Masukkan username"
                        />
                    </div>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Ganti Password</span>
                        </div>
                    </div>

                    {/* Current Password */}
                    <div className="space-y-2">
                        <Label htmlFor="profile-current-pw">Password Lama</Label>
                        <div className="relative">
                            <Input
                                id="profile-current-pw"
                                type={showCurrentPw ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Wajib diisi jika ganti password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPw(!showCurrentPw)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* New Password */}
                    <div className="space-y-2">
                        <Label htmlFor="profile-new-pw">Password Baru</Label>
                        <div className="relative">
                            <Input
                                id="profile-new-pw"
                                type={showNewPw ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Kosongkan jika tidak ingin ganti"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPw(!showNewPw)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Confirm Password */}
                    {newPassword && (
                        <div className="space-y-2">
                            <Label htmlFor="profile-confirm-pw">Konfirmasi Password Baru</Label>
                            <Input
                                id="profile-confirm-pw"
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Ulangi password baru"
                            />
                        </div>
                    )}

                    {/* Error / Success Messages */}
                    {error && (
                        <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>
                    )}
                    {success && (
                        <p className="text-sm text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-md">{success}</p>
                    )}

                    {/* Save Button */}
                    <Button onClick={handleSave} disabled={saving} className="w-full">
                        {saving ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4 mr-2" />
                        )}
                        Simpan Perubahan
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
