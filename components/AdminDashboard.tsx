'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { User, SessionUser, Question, Result, QuizPack, ClassGroup, ExamSession } from '@/types';
import { AdminProfile } from './admin/AdminProfile';
import {
    getUsers,
    getClasses,
    getPacks,
    getQuestions,
    getAllResults, getAnalysis,
    deleteResult, bulkDeleteResults, bulkResetUserAttempts
} from '@/app/actions/admin';
import { getExamSessions, getActiveSessionCounts, getPackSessionStatus } from '@/app/actions/monitoring';
import { ClassManagement } from './admin/ClassManagement';
import { UserManagement } from './admin/UserManagement';
import { ExamPacks } from './admin/ExamPacks';
import { ExamMonitoring } from './admin/ExamMonitoring';
import { QuestionBank } from './admin/QuestionBank';
import { ExamResults } from './admin/ExamResults';
import { ExamAnalysis } from './admin/ExamAnalysis';
import { TabSkeleton } from './admin/TabSkeleton';
import { LoginSlidesManagement } from './admin/LoginSlidesManagement';
import { useAdminHandlers } from '@/hooks/useAdminHandlers';
import { logger } from '@/lib/logger';
import {
    Users as UsersIcon, FileQuestion, BarChart3,
    LogOut,
    Activity, Eye, RotateCcw,
    PanelLeftClose, PanelLeft, FolderOpen, Menu, Layers, BarChart3 as BarChart3Icon,
    Loader2, Monitor, X as XIcon
} from 'lucide-react';

// shadcn/ui components
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList } from '@/components/ui/tabs';

interface AdminDashboardProps {
    user: SessionUser;
    onLogout: () => void;
    onProfileUpdate?: (updatedUser: SessionUser) => void;
}

type Tab = 'CLASSES' | 'USERS' | 'PACKS' | 'QUESTIONS' | 'MONITORING' | 'RESULTS' | 'ANALYSIS' | 'SLIDES';

const STALE_TIME = 30_000; // 30 seconds

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout, onProfileUpdate }) => {
    const [activeTab, setActiveTab] = useState<Tab>('CLASSES');
    const [showProfileDialog, setShowProfileDialog] = useState(false);

    // ==========================================================================
    // DATA STATE — each tab has its own data, loading flag, and lastFetched time
    // ==========================================================================
    const [classes, setClasses] = useState<ClassGroup[]>([]);
    const [packs, setPacks] = useState<QuizPack[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [results, setResults] = useState<Result[]>([]);

    // Per-tab loading & cache timestamps
    const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({});
    const lastFetchedRef = React.useRef<Record<string, number>>({});

    // Analysis State
    const [analysisPackId, setAnalysisPackId] = useState<string>('');
    const [analysisData, setAnalysisData] = useState<any>(null);

    // Monitoring State
    const [monitoringPackId, setMonitoringPackId] = useState<string>('');
    const [liveSessions, setLiveSessions] = useState<ExamSession[]>([]);
    const [sessionCounts, setSessionCounts] = useState<Record<string, number>>({});

    // Results Tab State
    const [selectedResultPackId, setSelectedResultPackId] = useState<string>('');
    const [resultSortBy, setResultSortBy] = useState<'time' | 'name' | 'absen' | 'class'>('time');
    const [resultSortDir, setResultSortDir] = useState<'asc' | 'desc'>('desc');
    const [resultSessionStatus, setResultSessionStatus] = useState<{ inProgress: string[], completed: string[] }>({ inProgress: [], completed: [] });

    // UI State
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // ==========================================================================
    // LAZY FETCH HELPERS
    // ==========================================================================

    const isStale = (key: string) => {
        const last = lastFetchedRef.current[key] || 0;
        return Date.now() - last > STALE_TIME;
    };

    const markFetched = (key: string) => {
        lastFetchedRef.current[key] = Date.now();
    };

    const setTabLoadingFor = (key: string, loading: boolean) => {
        setTabLoading(prev => ({ ...prev, [key]: loading }));
    };

    // ==========================================================================
    // EXTRACTED HANDLERS HOOK (SUG-4)
    // ==========================================================================
    const handlers = useAdminHandlers({
        classes, packs, questions,
        fetchClasses: async (force = false) => { await fetchClasses(force); },
        fetchUsers: async (force = false) => { await fetchUsers(force); },
        fetchPacks: async (force = false) => { await fetchPacks(force); },
        fetchQuestions: async (force = false) => { await fetchQuestions(force); },
        setTabLoadingFor,
    });

    // Core data: Classes + Packs (fetched on mount — lightweight)
    const fetchCoreData = useCallback(async () => {
        try {
            const [c, p] = await Promise.all([getClasses(), getPacks()]);
            setClasses(c as any);
            setPacks(p as any);
            markFetched('CLASSES');
            markFetched('PACKS');

            // Set default selections if empty
            if (p.length > 0) {
                if (!handlers.manualPackId && !handlers.editingId) handlers.setManualPackId(p[0].id);
                if (!analysisPackId) setAnalysisPackId(p[0].id);
                if (!selectedResultPackId) setSelectedResultPackId(p[0].id);
                if (!monitoringPackId) setMonitoringPackId(p[0].id);
            }
        } catch (e) {
            logger.error("Failed to load core data", e);
        }
    }, []);

    // Per-tab fetch functions
    const fetchUsers = useCallback(async (force = false) => {
        if (!force && !isStale('USERS') && users.length > 0) return;
        setTabLoadingFor('USERS', true);
        try {
            const u = await getUsers();
            setUsers(u as any);
            markFetched('USERS');
        } catch (e) { logger.error(e); }
        finally { setTabLoadingFor('USERS', false); }
    }, [users.length]);

    const fetchQuestions = useCallback(async (force = false) => {
        if (!force && !isStale('QUESTIONS') && questions.length > 0) return;
        setTabLoadingFor('QUESTIONS', true);
        try {
            const q = await getQuestions();
            setQuestions(q as any);
            markFetched('QUESTIONS');
        } catch (e) { logger.error(e); }
        finally { setTabLoadingFor('QUESTIONS', false); }
    }, [questions.length]);

    const fetchResults = useCallback(async (force = false) => {
        if (!force && !isStale('RESULTS') && results.length > 0) return;
        setTabLoadingFor('RESULTS', true);
        try {
            const r = await getAllResults();
            setResults(r as any);
            markFetched('RESULTS');
        } catch (e) { logger.error(e); }
        finally { setTabLoadingFor('RESULTS', false); }
    }, [results.length]);

    const fetchPacks = useCallback(async (force = false) => {
        if (!force && !isStale('PACKS')) return;
        try {
            const p = await getPacks();
            setPacks(p as any);
            markFetched('PACKS');
        } catch (e) { logger.error(e); }
    }, []);

    const fetchClasses = useCallback(async (force = false) => {
        if (!force && !isStale('CLASSES')) return;
        try {
            const c = await getClasses();
            setClasses(c as any);
            markFetched('CLASSES');
        } catch (e) { logger.error(e); }
    }, []);

    // ==========================================================================
    // TAB-TRIGGERED LAZY FETCH
    // ==========================================================================

    // On mount: only fetch Classes + Packs (super fast)
    useEffect(() => {
        fetchCoreData();
    }, [fetchCoreData]);

    // When tab changes: fetch that tab's data if stale
    useEffect(() => {
        switch (activeTab) {
            case 'CLASSES':
                fetchClasses();
                break;
            case 'USERS':
                fetchUsers();
                break;
            case 'PACKS':
                fetchPacks();
                break;
            case 'QUESTIONS':
                fetchQuestions();
                break;
            case 'RESULTS':
                fetchResults();
                // Users needed for results display
                fetchUsers();
                // Fetch active session userIds for retake status
                if (selectedResultPackId) {
                    getPackSessionStatus(selectedResultPackId).then(s => setResultSessionStatus(s)).catch(() => { });
                }
                break;
            case 'ANALYSIS':
                // Analysis is fetched separately via analysisPackId
                break;
            case 'MONITORING':
                // Monitoring has its own polling
                break;
        }
    }, [activeTab]);

    // Polling for PACKS tab only (auto-rotate token check)
    useEffect(() => {
        if (activeTab !== 'PACKS') return;
        const interval = setInterval(() => {
            getPacks().then(data => setPacks(data as any));
        }, 10000);
        return () => clearInterval(interval);
    }, [activeTab]);

    // Monitoring polling
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (activeTab === 'MONITORING') {
            const fetchMonitoringData = async () => {
                try {
                    const counts = await getActiveSessionCounts();
                    setSessionCounts(counts as any);
                    if (monitoringPackId) {
                        const sessions = await getExamSessions(monitoringPackId);
                        setLiveSessions(sessions as any);
                    }
                } catch (e) {
                    logger.error(e);
                }
            };
            fetchMonitoringData();
            interval = setInterval(fetchMonitoringData, 3000);
        }
        return () => clearInterval(interval);
    }, [activeTab, monitoringPackId]);

    // Analysis data fetch
    useEffect(() => {
        if (analysisPackId) {
            getAnalysis(analysisPackId).then(data => setAnalysisData(data));
        }
    }, [analysisPackId]);

    // ==========================================================================
    // SMART REFRESH — only fetches data for the active tab
    // ==========================================================================

    const refreshActiveTab = useCallback(async () => {
        switch (activeTab) {
            case 'CLASSES':
                await fetchClasses(true);
                break;
            case 'USERS':
                await fetchUsers(true);
                break;
            case 'PACKS':
                await fetchPacks(true);
                break;
            case 'QUESTIONS':
                await fetchQuestions(true);
                break;
            case 'RESULTS':
                await Promise.all([fetchResults(true), fetchUsers(true)]);
                if (selectedResultPackId) {
                    getPackSessionStatus(selectedResultPackId).then(s => setResultSessionStatus(s)).catch(() => { });
                }
                break;
            case 'ANALYSIS':
                if (analysisPackId) {
                    getAnalysis(analysisPackId).then(data => setAnalysisData(data));
                }
                break;
            case 'MONITORING':
                if (monitoringPackId) {
                    getExamSessions(monitoringPackId).then(s => setLiveSessions(s as any));
                }
                break;
        }
    }, [activeTab, analysisPackId, monitoringPackId, fetchClasses, fetchUsers, fetchPacks, fetchQuestions, fetchResults]);

    // ==========================================================================
    // RENDER
    // ==========================================================================

    const isTabLoading = (key: string) => tabLoading[key] === true;

    return (
        <div className="min-h-screen bg-background flex font-sans">
            {/* Mobile Backdrop */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden animate-in fade-in duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar — desktop: fixed, mobile: overlay drawer */}
            <aside className={`
                bg-card border-r flex flex-col transition-all duration-300 fixed h-full z-40
                ${sidebarCollapsed ? 'md:w-16' : 'md:w-64'}
                w-64
                ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
                md:translate-x-0
            `}>
                {/* Logo + Close button on mobile */}
                <div className="h-16 border-b flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" alt="YudaEdu Logo" className="w-7 h-7 object-contain" />
                        {!sidebarCollapsed && <span className="text-lg font-bold">YudaEdu</span>}
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden"
                        onClick={() => setMobileMenuOpen(false)}
                    >
                        <XIcon className="w-5 h-5" />
                    </Button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                    {[
                        { id: 'CLASSES', label: 'Kelas', icon: FolderOpen },
                        { id: 'USERS', label: 'Siswa', icon: UsersIcon },
                        { id: 'PACKS', label: 'Paket Ujian', icon: Layers },
                        { id: 'QUESTIONS', label: 'Bank Soal', icon: FileQuestion },
                        { id: 'MONITORING', label: 'Monitoring', icon: Activity },
                        { id: 'RESULTS', label: 'Hasil Ujian', icon: Eye },
                        { id: 'ANALYSIS', label: 'Analisis', icon: BarChart3 },
                        { id: 'SLIDES', label: 'Login Slider', icon: Monitor },
                    ].map((item) => (
                        <Button
                            key={item.id}
                            variant={activeTab === item.id ? 'secondary' : 'ghost'}
                            className={`w-full ${sidebarCollapsed ? 'md:justify-center md:px-2' : ''} justify-start ${activeTab === item.id ? 'bg-primary/10 text-primary' : ''}`}
                            onClick={() => {
                                setActiveTab(item.id as Tab);
                                setMobileMenuOpen(false);
                            }}
                        >
                            <item.icon className={`w-4 h-4 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                            {(!sidebarCollapsed || mobileMenuOpen) && <span className={sidebarCollapsed ? 'md:hidden' : ''}>{item.label}</span>}
                        </Button>
                    ))}
                </nav>

                {/* User Info */}
                <div className="border-t p-3">
                    <div className={`flex items-center ${sidebarCollapsed ? 'md:justify-center' : 'gap-3'}`}>
                        <button
                            onClick={() => setShowProfileDialog(true)}
                            className="relative group flex-shrink-0"
                            title="Pengaturan Profil"
                        >
                            {user.profileImage ? (
                                <img
                                    src={user.profileImage}
                                    alt="Profile"
                                    className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent group-hover:ring-primary/50 transition-all"
                                />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold ring-2 ring-transparent group-hover:ring-primary/50 transition-all">
                                    {(user.fullName || user.username).charAt(0).toUpperCase()}
                                </div>
                            )}
                        </button>
                        {(!sidebarCollapsed || mobileMenuOpen) && (
                            <button
                                onClick={() => setShowProfileDialog(true)}
                                className={`flex-1 min-w-0 text-left hover:opacity-70 transition-opacity ${sidebarCollapsed ? 'md:hidden' : ''}`}
                            >
                                <p className="text-sm font-medium truncate">{user.fullName || user.username}</p>
                                <p className="text-xs text-muted-foreground">Administrator</p>
                            </button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onLogout}
                            className={`hover:text-destructive ${sidebarCollapsed && !mobileMenuOpen ? 'hidden' : ''}`}
                            title="Keluar"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    </div>
                    {sidebarCollapsed && !mobileMenuOpen && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onLogout}
                            className="w-full mt-2 hover:text-destructive hidden md:flex"
                            title="Keluar"
                        >
                            <LogOut className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className={`flex-1 ml-0 ${sidebarCollapsed ? 'md:ml-16' : 'md:ml-64'} transition-all duration-300`}>
                {/* Top Bar */}
                <header className="h-16 bg-card border-b sticky top-0 z-20 flex items-center justify-between px-4 md:px-6">
                    <div className="flex items-center gap-2">
                        {/* Mobile: Hamburger menu */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => setMobileMenuOpen(true)}
                        >
                            <Menu className="w-5 h-5" />
                        </Button>
                        {/* Desktop: Sidebar toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden md:inline-flex"
                            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        >
                            {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                        </Button>
                        <h1 className="text-lg md:text-xl font-semibold">
                            {activeTab === 'CLASSES' ? 'Kelas' :
                             activeTab === 'USERS' ? 'Siswa' :
                             activeTab === 'PACKS' ? 'Paket Ujian' :
                             activeTab === 'QUESTIONS' ? 'Bank Soal' :
                             activeTab === 'MONITORING' ? 'Monitoring' :
                             activeTab === 'RESULTS' ? 'Hasil Ujian' :
                             activeTab === 'ANALYSIS' ? 'Analisis' :
                             activeTab === 'SLIDES' ? 'Login Slider' : activeTab}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={refreshActiveTab} disabled={isTabLoading(activeTab)}>
                            {isTabLoading(activeTab) ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RotateCcw className="w-4 h-4 mr-2" />
                            )}
                            Segarkan Data
                        </Button>
                    </div>
                </header>

                <div className="p-6">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)} className="space-y-6">
                        {/* TabsList hidden - controlled by sidebar */}
                        <TabsList className="hidden"></TabsList>

                        <TabsContent value="CLASSES">
                            <ClassManagement
                                classes={classes}
                                newClassName={handlers.newClassName}
                                setNewClassName={handlers.setNewClassName}
                                handleCreateClass={handlers.handleCreateClass}
                                handleDeleteClass={handlers.handleDeleteClass}
                            />
                        </TabsContent>

                        <TabsContent value="USERS">
                            {isTabLoading('USERS') && users.length === 0 ? (
                                <TabSkeleton type="table" />
                            ) : (
                                <UserManagement
                                    users={users}
                                    classes={classes}
                                    showUserModal={handlers.showUserModal}
                                    setShowUserModal={handlers.setShowUserModal}
                                    userForm={handlers.userForm}
                                    setUserForm={handlers.setUserForm}
                                    handleDeleteUser={handlers.handleDeleteUser}
                                    handleBulkDeleteUsers={handlers.handleBulkDeleteUsers}
                                    handleSaveManualUser={handlers.handleSaveManualUser}
                                    handleDownloadTemplate={handlers.handleDownloadTemplate}
                                    handleImportStudents={handlers.handleImportStudents}
                                    fileInputRef={handlers.fileInputRef}
                                    isImporting={handlers.isImporting}
                                    importProgress={handlers.importProgress}
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="PACKS">
                            <ExamPacks
                                packs={packs}
                                classes={classes}
                                packForm={handlers.packForm}
                                setPackForm={handlers.setPackForm}
                                handleSavePack={handlers.handleSavePack}
                                handleDeletePack={handlers.handleDeletePack}
                                handleToggleActive={handlers.handleToggleActive}
                                handleDuplicatePack={handlers.handleDuplicatePack}
                                handleImportQuestionsFromPack={handlers.handleImportQuestionsFromPack}
                                handleGenerateToken={handlers.handleGenerateToken}
                                toggleClassForPack={handlers.toggleClassForPack}
                                handleCancelEdit={() => handlers.setPackForm({ name: '', timeLimit: 60, token: '', allowedClassIds: [], randomizeQuestions: true, randomizeOptions: true, autoRotateToken: false, scheduleStart: '', scheduleEnd: '' })}
                            />
                        </TabsContent>

                        <TabsContent value="MONITORING">
                            <ExamMonitoring
                                packs={packs}
                                classes={classes}
                                users={users}
                                results={results}
                                monitoringPackId={monitoringPackId}
                                setMonitoringPackId={setMonitoringPackId}
                                liveSessions={liveSessions}
                                sessionCounts={sessionCounts}
                            />
                        </TabsContent>

                        <TabsContent value="QUESTIONS">
                            {isTabLoading('QUESTIONS') && questions.length === 0 ? (
                                <TabSkeleton type="cards" />
                            ) : (
                                <QuestionBank
                                    packs={packs}
                                    questions={questions}
                                    manualPackId={handlers.manualPackId}
                                    setManualPackId={handlers.setManualPackId}
                                    editingId={handlers.editingId}
                                    manualQ={handlers.manualQ}
                                    setManualQ={handlers.setManualQ}
                                    genTopic={handlers.genTopic}
                                    setGenTopic={handlers.setGenTopic}
                                    genVariant={handlers.genVariant}
                                    setGenVariant={handlers.setGenVariant}
                                    isGenerating={handlers.isGenerating}
                                    questionVariantFilter={handlers.questionVariantFilter}
                                    setQuestionVariantFilter={handlers.setQuestionVariantFilter}
                                    showQuickPackModal={handlers.showQuickPackModal}
                                    setShowQuickPackModal={handlers.setShowQuickPackModal}
                                    packForm={handlers.packForm}
                                    setPackForm={handlers.setPackForm}
                                    handleSaveQuestion={handlers.handleSaveQuestion}
                                    handleDeleteQuestion={handlers.handleDeleteQuestion}
                                    handleStartEdit={handlers.handleStartEdit}
                                    handleGenerateAI={handlers.handleGenerateAI}
                                    handleSavePack={handlers.handleSavePack}
                                    resetManualForm={handlers.resetManualForm}
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="RESULTS">
                            {isTabLoading('RESULTS') && results.length === 0 ? (
                                <TabSkeleton type="table" />
                            ) : (
                                <ExamResults
                                    users={users}
                                    classes={classes}
                                    packs={packs}
                                    results={results}
                                    selectedResultPackId={selectedResultPackId}
                                    setSelectedResultPackId={(v: string) => {
                                        setSelectedResultPackId(v);
                                        // Fetch session status for the newly selected pack
                                        getPackSessionStatus(v).then(s => setResultSessionStatus(s)).catch(() => { });
                                    }}
                                    resultSortBy={resultSortBy}
                                    setResultSortBy={setResultSortBy}
                                    resultSortDir={resultSortDir}
                                    setResultSortDir={setResultSortDir}
                                    refreshData={refreshActiveTab}
                                    activeSessionUserIds={resultSessionStatus.inProgress}
                                    completedSessionUserIds={resultSessionStatus.completed}
                                    onDeleteResult={async (id: string) => {
                                        await deleteResult(id);
                                        fetchResults(true);
                                    }}
                                    onBulkDeleteResults={async (ids: string[]) => {
                                        await bulkDeleteResults(ids);
                                        fetchResults(true);
                                    }}
                                    onBulkResetUserAttempts={async (userIds: string[], packId: string) => {
                                        await bulkResetUserAttempts(userIds, packId);
                                        await Promise.all([fetchResults(true), fetchUsers(true)]);
                                        getPackSessionStatus(packId).then(s => setResultSessionStatus(s)).catch(() => { });
                                    }}
                                />
                            )}
                        </TabsContent>

                        <TabsContent value="ANALYSIS">
                            <ExamAnalysis
                                packs={packs}
                                analysisPackId={analysisPackId}
                                setAnalysisPackId={setAnalysisPackId}
                                analysisData={analysisData}
                            />
                        </TabsContent>

                        <TabsContent value="SLIDES">
                            <LoginSlidesManagement />
                        </TabsContent>
                    </Tabs>
                </div>
            </main>

            {/* Admin Profile Dialog */}
            <AdminProfile
                open={showProfileDialog}
                onOpenChange={setShowProfileDialog}
                user={user}
                onProfileUpdated={(updated) => onProfileUpdate?.(updated)}
            />
        </div>
    );
};