'use client';

import { useCallback, useRef, useState } from 'react';
import { Question, QuizPack, ClassGroup } from '@/types';
import { Role } from '@/types';
import {
    createUser, deleteUser, bulkDeleteUsers,
    createClass, deleteClass,
    createPack, updatePack, deletePack, duplicatePack,
    getQuestionsByPack, createQuestion, updateQuestion, deleteQuestion,
} from '@/app/actions/admin';
import { generateQuizQuestions } from '@/app/actions/exam';
import * as XLSX from 'xlsx';
import { logger } from '@/lib/logger';

// --- ID Generator ---
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

interface UseAdminHandlersOptions {
    classes: ClassGroup[];
    packs: QuizPack[];
    questions: Question[];
    fetchClasses: (force?: boolean) => Promise<void>;
    fetchUsers: (force?: boolean) => Promise<void>;
    fetchPacks: (force?: boolean) => Promise<void>;
    fetchQuestions: (force?: boolean) => Promise<void>;
    setTabLoadingFor: (key: string, loading: boolean) => void;
    requireConfirm: (title: string, message: string, onConfirm: () => void | Promise<void>) => void;
}

export function useAdminHandlers({
    classes,
    packs,
    questions,
    fetchClasses,
    fetchUsers,
    fetchPacks,
    fetchQuestions,
    setTabLoadingFor,
    requireConfirm,
}: UseAdminHandlersOptions) {
    // Manual Add/Edit State for Questions
    const [editingId, setEditingId] = useState<string | null>(null);
    const [manualQ, setManualQ] = useState<Partial<Question>>({
        text: '',
        stimulus: '',
        options: ['', '', '', '', ''],
        correctAnswer: '',
        variant: 'A'
    });
    const [manualPackId, setManualPackId] = useState('');

    // Manual User Add State
    const [showUserModal, setShowUserModal] = useState(false);
    const [userForm, setUserForm] = useState({
        fullName: '',
        username: '',
        password: '',
        classId: '',
        absentNumber: ''
    });

    // Pack State
    const [packForm, setPackForm] = useState<Partial<QuizPack>>({
        name: '',
        timeLimit: 60,
        token: '',
        allowedClassIds: [],
        randomizeQuestions: true,
        randomizeOptions: true,
        autoRotateToken: false,
        scheduleStart: '',
        scheduleEnd: ''
    });
    const [showQuickPackModal, setShowQuickPackModal] = useState(false);

    // Class State
    const [newClassName, setNewClassName] = useState('');

    // AI Generation State
    const [genTopic, setGenTopic] = useState('');
    const [genVariant, setGenVariant] = useState('A');
    const [isGenerating, setIsGenerating] = useState(false);
    const [questionVariantFilter, setQuestionVariantFilter] = useState<string>('ALL');

    // Import State
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- Class Management ---
    const handleCreateClass = async () => {
        if (!newClassName) return;
        await createClass({ id: generateId(), name: newClassName });
        setNewClassName('');
        fetchClasses(true);
    };

    const handleDeleteClass = (id: string) => {
        requireConfirm(
            "Hapus Kelas",
            "Delete class? Users in this class will be unassigned.",
            async () => {
                await deleteClass(id);
                fetchClasses(true);
            }
        );
    };

    // --- User Management ---
    const handleDeleteUser = (id: string) => {
        requireConfirm(
            "Hapus Siswa",
            "Are you sure you want to delete this user?",
            async () => {
                await deleteUser(id);
                fetchUsers(true);
            }
        );
    };

    const handleBulkDeleteUsers = (ids: string[]) => {
        if (ids.length === 0) return;
        requireConfirm(
            "Hapus Banyak Siswa",
            `Hapus ${ids.length} siswa yang dipilih? Tindakan ini tidak bisa dibatalkan.`,
            async () => {
                setTabLoadingFor('USERS', true);
                try {
                    const result = await bulkDeleteUsers(ids);
                    if (result.error) {
                        alert(`Gagal: ${result.error}`);
                    } else {
                        fetchUsers(true);
                    }
                } catch (e) {
                    logger.error(e);
                    alert('Terjadi kesalahan saat menghapus siswa.');
                } finally {
                    setTabLoadingFor('USERS', false);
                }
            }
        );
    };

    const handleSaveManualUser = async () => {
        if (!userForm.username || !userForm.password) return;
        await createUser({ ...userForm, role: Role.USER });
        setShowUserModal(false);
        setUserForm({ fullName: '', username: '', password: '', classId: '', absentNumber: '' });
        fetchUsers(true);
    };

    // --- Pack Management ---
    const handleSavePack = async () => {
        if (!packForm.name) return;
        if (packForm.id) {
            await updatePack(packForm);
        } else {
            await createPack(packForm);
        }
        setPackForm({ name: '', timeLimit: 60, token: '', allowedClassIds: [], randomizeQuestions: true, randomizeOptions: true, autoRotateToken: false, scheduleStart: '', scheduleEnd: '' });
        fetchPacks(true);
    };

    const handleDeletePack = (id: string) => {
        requireConfirm(
            "Hapus Paket Ujian",
            "Delete this exam pack? All questions will be deleted too.",
            async () => {
                await deletePack(id);
                fetchPacks(true);
            }
        );
    };

    const handleToggleActive = async (pack: QuizPack) => {
        await updatePack({ id: pack.id, isActive: !pack.isActive });
        fetchPacks(true);
    };

    const handleDuplicatePack = (pack: QuizPack) => {
        requireConfirm(
            "Duplikasi Paket Ujian",
            "Duplicate this exam pack and all its questions?",
            async () => {
                const newId = generateId();
                const newToken = generateId().substring(0, 6).toUpperCase();
                const result = await duplicatePack(pack.id, newId, `${pack.name} (Copy)`, newToken);

                if (result.error) {
                    alert(`Gagal menduplikasi: ${result.error}`);
                    return;
                }

                fetchPacks(true);
            }
        );
    };

    const handleImportQuestionsFromPack = async (targetPackId: string, sourcePackId: string) => {
        const sourceQuestions = await getQuestionsByPack(sourcePackId);
        if (sourceQuestions.length === 0) {
            alert('Tidak ada soal di pack sumber.');
            return { success: false, count: 0 };
        }
        for (const q of sourceQuestions) {
            const { id, packId, ...rest } = q as any;
            await createQuestion({ ...rest, id: generateId(), packId: targetPackId });
        }
        fetchQuestions(true);
        return { success: true, count: sourceQuestions.length };
    };

    const handleGenerateToken = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPackForm(prev => ({ ...prev, token: result }));
    };

    const toggleClassForPack = (classId: string) => {
        const current = (packForm.allowedClassIds as string[]) || [];
        if (current.includes(classId)) {
            setPackForm({ ...packForm, allowedClassIds: current.filter(id => id !== classId) });
        } else {
            setPackForm({ ...packForm, allowedClassIds: [...current, classId] });
        }
    };

    // --- Question Management ---
    const extractUploadUrls = (...htmlStrings: (string | undefined)[]): string[] => {
        const urls: string[] = [];
        const regex = /\/uploads\/[^"'\s)]+/g;
        for (const html of htmlStrings) {
            if (!html) continue;
            let match;
            while ((match = regex.exec(html)) !== null) {
                if (!urls.includes(match[0])) urls.push(match[0]);
            }
        }
        return urls;
    };

    const deleteUploadFiles = async (urls: string[]) => {
        for (const url of urls) {
            try {
                await fetch('/api/upload', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
            } catch (e) { logger.error('Failed to delete', url, e); }
        }
    };

    const handleSaveQuestion = async () => {
        if (!manualPackId || !manualQ.text) return;

        const payload = { ...manualQ, packId: manualPackId, options: manualQ.options, correctAnswer: manualQ.correctAnswer };

        if (editingId) {
            const oldQ = questions.find(q => q.id === editingId);
            if (oldQ) {
                const oldUrls = extractUploadUrls(oldQ.text, oldQ.stimulus, ...(oldQ.options as string[]));
                const newUrls = extractUploadUrls(manualQ.text, manualQ.stimulus, ...(manualQ.options || []));
                const removedUrls = oldUrls.filter(u => !newUrls.includes(u));
                if (removedUrls.length > 0) deleteUploadFiles(removedUrls);
            }
            await updateQuestion({ id: editingId, ...payload });
        } else {
            await createQuestion(payload);
        }
        resetManualForm();
        fetchQuestions(true);
    };

    const handleStartEdit = (q: Question) => {
        setEditingId(q.id);
        setManualQ({ text: q.text, stimulus: q.stimulus, options: q.options, correctAnswer: q.correctAnswer, variant: q.variant });
        setManualPackId(q.packId);
    };

    const handleDeleteQuestion = (id: string) => {
        requireConfirm(
            "Hapus Soal",
            "Delete question?",
            async () => {
                const q = questions.find(q => q.id === id);
                if (q) {
                    const urls = extractUploadUrls(q.text, q.stimulus, ...(q.options as string[]));
                    if (urls.length > 0) deleteUploadFiles(urls);
                }
                await deleteQuestion(id);
                fetchQuestions(true);
            }
        );
    };

    const resetManualForm = () => {
        setEditingId(null);
        setManualQ({ text: '', stimulus: '', options: ['', '', '', '', ''], correctAnswer: '', variant: 'A' });
    };

    const handleGenerateAI = async () => {
        if (!manualPackId || !genTopic) return;
        setIsGenerating(true);
        try {
            const newQuestions = await generateQuizQuestions(genTopic, 5, genVariant);
            await Promise.all(newQuestions.map((q: any) => createQuestion({ ...q, packId: manualPackId })));
            setGenTopic('');
            fetchQuestions(true);
        } catch (e) {
            alert("AI Generation failed. Check API Key.");
        } finally {
            setIsGenerating(false);
        }
    };

    // --- Import Students ---
    const handleDownloadTemplate = () => {
        const templateData = [
            { 'NoAbsen': '1', 'Name': 'John Doe', 'Username': 'johndoe', 'Password': 'password123', 'Class': '12 IPA 1' },
            { 'NoAbsen': '2', 'Name': 'Jane Smith', 'Username': 'janesmith', 'Password': 'password456', 'Class': '12 IPA 1' }
        ];
        const worksheet = XLSX.utils.json_to_sheet(templateData);
        worksheet['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 20 }, { wch: 15 }, { wch: 15 }];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
        XLSX.writeFile(workbook, 'Student_Import_Template.xlsx');
    };

    const handleImportStudents = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportProgress({ current: 0, total: 0 });

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                if (!bstr) {
                    setIsImporting(false);
                    return;
                }

                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws) as any[];

                if (data.length === 0) {
                    alert('File Excel kosong atau format tidak valid.');
                    setIsImporting(false);
                    return;
                }

                setImportProgress({ current: 0, total: data.length });

                let successCount = 0;
                let errorCount = 0;
                const errors: string[] = [];

                for (let i = 0; i < data.length; i++) {
                    const row = data[i];
                    const rowNum = i + 2;
                    const name = row['Name'] || row['name'] || row['Nama'] || row['nama'] || row['FullName'] || row['fullname'];
                    const username = row['Username'] || row['username'] || row['NIS'] || row['nis'] || name;
                    const password = row['Password'] || row['password'] || row['Pass'] || row['pass'];
                    const className = row['Class'] || row['class'] || row['Kelas'] || row['kelas'];
                    const absentNumber = row['NoAbsen'] || row['noabsen'] || row['No'] || row['no'] || row['Number'] || '';

                    if (!name) { errors.push(`Baris ${rowNum}: Nama tidak boleh kosong`); errorCount++; setImportProgress({ current: i + 1, total: data.length }); continue; }
                    if (!password) { errors.push(`Baris ${rowNum}: Password tidak boleh kosong`); errorCount++; setImportProgress({ current: i + 1, total: data.length }); continue; }

                    const cls = classes.find(c => c.name.toLowerCase() === (className || '').toString().toLowerCase());

                    try {
                        await createUser({
                            id: generateId(),
                            username: username?.toString() || name?.toString(),
                            fullName: name?.toString(),
                            password: password?.toString(),
                            role: Role.USER,
                            classId: cls?.id || null,
                            absentNumber: absentNumber?.toString() || undefined,
                            maxAttempts: 1,
                            currentAttempts: 0
                        });
                        successCount++;
                    } catch (err: any) {
                        errors.push(`Baris ${rowNum}: ${err.message || 'Gagal menyimpan data'}`);
                        errorCount++;
                    }
                    setImportProgress({ current: i + 1, total: data.length });
                }

                let message = `Import selesai!\n✅ Berhasil: ${successCount} siswa`;
                if (errorCount > 0) {
                    message += `\n❌ Gagal: ${errorCount} siswa`;
                    if (errors.length <= 5) {
                        message += `\n\nDetail error:\n${errors.join('\n')}`;
                    } else {
                        message += `\n\nDetail error (5 pertama):\n${errors.slice(0, 5).join('\n')}\n... dan ${errors.length - 5} error lainnya`;
                    }
                }
                alert(message);
                fetchUsers(true);
            } catch (err) {
                logger.error(err);
                alert("Gagal membaca file Excel. Pastikan format file benar.");
            } finally {
                setIsImporting(false);
                setImportProgress({ current: 0, total: 0 });
            }
        };
        reader.readAsBinaryString(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return {
        // Class handlers
        newClassName, setNewClassName,
        handleCreateClass, handleDeleteClass,
        // User handlers
        showUserModal, setShowUserModal,
        userForm, setUserForm,
        handleDeleteUser, handleBulkDeleteUsers, handleSaveManualUser,
        handleDownloadTemplate, handleImportStudents,
        fileInputRef, isImporting, importProgress,
        // Pack handlers
        packForm, setPackForm, showQuickPackModal, setShowQuickPackModal,
        handleSavePack, handleDeletePack, handleToggleActive,
        handleDuplicatePack, handleImportQuestionsFromPack,
        handleGenerateToken, toggleClassForPack,
        // Question handlers
        editingId, manualQ, setManualQ,
        manualPackId, setManualPackId,
        genTopic, setGenTopic, genVariant, setGenVariant,
        isGenerating, questionVariantFilter, setQuestionVariantFilter,
        handleSaveQuestion, handleStartEdit, handleDeleteQuestion,
        resetManualForm, handleGenerateAI,
    };
}
