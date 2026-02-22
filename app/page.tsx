'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { getSession, logout } from './actions/auth';
import { Login } from '@/components/auth/Login';
import { SessionUser, Role } from '@/types';

// WARN-8: Lazy-load heavy components — students don't download admin bundle, vice versa
const AdminDashboard = dynamic(() => import('@/components/AdminDashboard').then(m => ({ default: m.AdminDashboard })), {
    loading: () => <div className="min-h-screen flex items-center justify-center">Loading Dashboard...</div>,
    ssr: false,
});
const Quiz = dynamic(() => import('@/components/quiz/Quiz').then(m => ({ default: m.Quiz })), {
    loading: () => <div className="min-h-screen flex items-center justify-center">Loading Exam...</div>,
    ssr: false,
});
const ResultView = dynamic(() => import('@/components/quiz/ResultView').then(m => ({ default: m.ResultView })), {
    ssr: false,
});

export default function Home() {
    const [user, setUser] = useState<SessionUser | null>(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'LOGIN' | 'DASHBOARD' | 'QUIZ' | 'RESULT'>('LOGIN');
    const [resultReason, setResultReason] = useState<'submitted' | 'expired'>('submitted');

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const session = await getSession();
            if (session) {
                const userData: SessionUser = {
                    id: session.id,
                    username: session.username,
                    fullName: session.fullName,
                    role: session.role,
                    classId: session.classId,
                    className: session.className,
                    profileImage: session.profileImage,
                };
                setUser(userData);
                setView(userData.role === Role.ADMIN ? 'DASHBOARD' : 'QUIZ');
            } else {
                setView('LOGIN');
            }
        } catch (e) {
            console.error(e);
            setView('LOGIN');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (sessionUser: SessionUser) => {
        setUser(sessionUser);
        setView(sessionUser.role === Role.ADMIN ? 'DASHBOARD' : 'QUIZ');
    };

    const handleLogout = async () => {
        // Clear UI state first to unmount dashboard (stops all intervals/polling)
        setUser(null);
        setResultReason('submitted');
        setView('LOGIN');
        // Then delete session cookie in background
        await logout();
    };

    const handleFinish = (result: any) => {
        const isExpired = result?.id === 'expired';
        setResultReason(isExpired ? 'expired' : 'submitted');
        setView('RESULT');
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    if (view === 'LOGIN') {
        return <Login onLogin={handleLogin} />;
    }

    if (view === 'DASHBOARD' && user?.role === Role.ADMIN) {
        return <AdminDashboard onLogout={handleLogout} user={user} onProfileUpdate={(updatedUser) => setUser(updatedUser)} />;
    }

    if (view === 'QUIZ' && user) {
        return <Quiz user={user} onFinish={handleFinish} onLogout={handleLogout} />;
    }

    if (view === 'RESULT') {
        return <ResultView reason={resultReason} onLogout={handleLogout} />;
    }

    return null;
}
