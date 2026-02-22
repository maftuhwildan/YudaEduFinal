'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SessionUser, Question, Result, QuizPack } from '@/types';
import { formatQuizContent } from '@/lib/formatQuizContent';
import {
    CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Clock, Flag, XCircle,
    ShieldAlert, Key, BookOpen, LogOut, RotateCcw, AlertTriangle, Maximize, Lock
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SlidingNumber } from '@/components/ui/animated';

import { useFullscreen } from '@/hooks/useFullscreen';
import { useQuizTimer } from '@/hooks/useQuizTimer';
import { useAntiCheat } from '@/hooks/useAntiCheat';
import { useQuizSession } from '@/hooks/useQuizSession';
import { useTableAutoScale } from '@/hooks/useTableAutoScale';

interface QuizProps {
    user: SessionUser;
    onFinish: (result: Result) => void;
    onLogout: () => void;
}

export const Quiz: React.FC<QuizProps> = ({ user, onFinish, onLogout }) => {
    // --- Modal State (pure UI, stays in component) ---
    const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [showCheatWarning, setShowCheatWarning] = useState(false);
    const [cheatWarningMsg, setCheatWarningMsg] = useState('');

    // --- Fullscreen ---
    const { isFullscreen, setIsFullscreen, enterFullscreen, handleFullscreenChange, isIOS } =
        useFullscreen();

    // --- Quiz Session (data, navigation, answers, heartbeat, submit) ---
    const handleExpired = useCallback(() => {
        onFinish({
            id: 'expired',
            userId: user.id,
            username: user.username,
            classId: user.classId || '',
            score: 0,
            correctCount: 0,
            totalQuestions: 0,
            packName: '',
            variant: 'A',
            timestamp: new Date().toISOString(),
            cheatCount: 0,
        });
    }, [user, onFinish]);

    // setTimeLeft is provided by the timer hook — we need a reference before the timer hook is called.
    // We use a ref-callback pattern to avoid circular dependency.
    const [timeSetter, setTimeSetter] = useState<((t: number) => void) | null>(null);

    const handleSessionKicked = useCallback(() => {
        alert('Akun Anda telah login di perangkat lain. Anda akan keluar dari sesi ini.');
        onLogout();
    }, [onLogout]);

    const session = useQuizSession({
        user,
        onFinish,
        onExpired: handleExpired,
        onSessionKicked: handleSessionKicked,
        setTimeLeft: (t: number) => timeSetter?.(t),
        enterFullscreen,
    });

    // --- Timer ---
    const { timeLeft, setTimeLeft } = useQuizTimer({
        active: session.stage === 'QUIZ',
        onExpire: () => {
            if (session.stage === 'QUIZ') session.executeSubmission();
        },
    });

    // Wire setTimeLeft back into the session hook via state
    if (timeSetter !== setTimeLeft) setTimeSetter(() => setTimeLeft);

    // --- Anti-Cheat ---
    useAntiCheat({
        active: session.stage === 'QUIZ',
        isFullscreen,
        showCheatWarning,
        onCheat: (msg, increment) => {
            if (increment) session.setCheatCount(prev => prev + 1);
            setCheatWarningMsg(msg);
            setShowCheatWarning(true);
        },
        onFullscreenChange: () => {
            handleFullscreenChange();
            // If we just exited fullscreen, increment cheat count
            if (!isIOS && document.fullscreenElement === null) {
                session.setCheatCount(prev => prev + 1);
            }
        },
    });

    const logout = () => onLogout();

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const { stage, availablePacks, selectedPackId, handlePackSelection,
        tokenInput, setTokenInput, errorMessage, existingSession, startQuiz,
        questions, pack, currentIndex, setCurrentIndex, answers, handleSelect,
        cheatCount } = session;

    // --- Derived UI values ---
    const progressValue = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
    const answeredProgress = questions.length > 0 ? (Object.keys(answers).length / questions.length) * 100 : 0;
    const unansweredCount = questions.length - Object.keys(answers).length;

    // --- Auto-scale tables that overflow their container ---
    // Uses ResizeObserver + MutationObserver instead of setTimeout/resize.
    // CRITICAL: Only depends on currentIndex, NOT answers — clicking an option
    // must never reset the applied table transforms.
    const quizContentRef = useRef<HTMLDivElement | null>(null);
    useTableAutoScale(quizContentRef, currentIndex);

    // ===================== VIEWS =====================

    if (stage === 'ERROR') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="max-w-md w-full text-center border-destructive">
                    <CardHeader>
                        <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                        <CardTitle>Access Denied</CardTitle>
                        <CardDescription>{errorMessage}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={logout} variant="outline">Logout</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (stage === 'SELECT_PACK') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 font-sans">
                <div className="max-w-2xl w-full">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold">Available Exams</h1>
                        <p className="text-muted-foreground">Hello, {user.fullName || user.username}. Please select an exam.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {availablePacks.map(p => (
                            <Card
                                key={p.id}
                                className="cursor-pointer hover:border-primary transition-all group"
                                onClick={() => handlePackSelection(p.id)}
                            >
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 text-primary rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                            <BookOpen className="w-5 h-5" />
                                        </div>
                                        <CardTitle className="text-lg group-hover:text-primary">{p.name}</CardTitle>
                                    </div>
                                    <CardDescription className="flex gap-4 mt-2">
                                        <span>{p.timeLimit} Minutes</span>
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>

                    <div className="mt-8 text-center">
                        <Button variant="ghost" onClick={logout} className="text-muted-foreground hover:text-destructive">
                            <LogOut className="w-4 h-4 mr-2" /> Logout
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (stage === 'TOKEN') {
        const selectedPackName = availablePacks.find(p => p.id === selectedPackId)?.name || 'Exam';

        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <Card className="max-w-sm w-full relative">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => availablePacks.length > 1 ? session.setStage('SELECT_PACK') : logout()}
                        className="absolute top-4 left-4"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>

                    <CardHeader className="text-center pt-12">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Key className="w-6 h-6 text-primary" />
                        </div>
                        <CardTitle>{existingSession ? 'Resume Exam' : 'Enter Exam Token'}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-2">Enter the exam token to {existingSession ? 'resume' : 'start'}.</p>
                        <CardDescription className="font-medium text-primary">{selectedPackName}</CardDescription>

                        {existingSession && (
                            <Alert className="mt-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                                <RotateCcw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                <AlertDescription className="text-blue-700 dark:text-blue-400 font-bold text-xs">
                                    You have an active session. Enter token to resume.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                        {errorMessage && (
                            <p className="text-xs text-destructive text-center font-bold">{errorMessage}</p>
                        )}

                        <Input
                            type="text"
                            value={tokenInput}
                            onChange={e => setTokenInput(e.target.value.toUpperCase())}
                            className="text-center text-2xl font-mono tracking-widest uppercase"
                            placeholder="TOKEN"
                        />

                        <Button onClick={startQuiz} className="w-full" size="lg">
                            {existingSession ? 'RESUME EXAM' : 'START EXAM'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // --- QUIZ stage ---
    const currentQ = questions[currentIndex];
    if (!currentQ) return <div className="flex items-center justify-center min-h-screen">Loading exam...</div>;

    const hasStimulus = !!currentQ.stimulus;

    return (
        <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden select-none">

            {/* Fullscreen Lockout Modal */}
            <Dialog open={!isFullscreen && stage === 'QUIZ'} onOpenChange={() => { }}>
                <DialogContent className="sm:max-w-md border-4 border-destructive" hideClose>
                    <div className="text-center">
                        <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
                            <Lock className="w-10 h-10 text-destructive" />
                        </div>
                        <DialogTitle className="text-2xl mb-2">Exam Locked</DialogTitle>
                        <DialogDescription className="mb-6">
                            You have exited fullscreen mode. To prevent cheating, the exam is hidden.
                            <span className="text-xs font-bold text-destructive mt-2 block">This action has been flagged.</span>
                        </DialogDescription>
                        <Button onClick={enterFullscreen} className="w-full" size="lg">
                            Return to Fullscreen
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Security Warning Modal */}
            <Dialog open={showCheatWarning && isFullscreen} onOpenChange={setShowCheatWarning}>
                <DialogContent className="sm:max-w-sm border-2 border-destructive">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                            <AlertTriangle className="w-8 h-8 text-destructive" />
                        </div>
                        <DialogTitle className="text-destructive mb-2">Security Warning!</DialogTitle>
                        <DialogDescription className="font-medium mb-4">{cheatWarningMsg}</DialogDescription>
                        <p className="text-xs text-muted-foreground mb-6">
                            Your actions are being monitored and recorded. Continued violations may result in exam termination.
                        </p>
                        <Button variant="destructive" onClick={() => setShowCheatWarning(false)} className="w-full">
                            I Understand
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Submit Confirm Modal */}
            <Dialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Submit Exam?</DialogTitle>
                        <DialogDescription>
                            {unansweredCount > 0 ? `You have ${unansweredCount} unanswered questions.` : 'You are about to finish the exam.'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-3 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>Back</Button>
                        <Button onClick={session.executeSubmission}>Submit</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Logout Confirm Modal */}
            <Dialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Logout?</DialogTitle>
                        <DialogDescription>
                            You are exiting without submitting. Progress may be lost.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-3 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={logout}>Logout</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Header */}
            <header className="bg-card border-b px-4 sm:px-6 py-3 flex justify-between items-center z-20 h-16 shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold hidden sm:block truncate max-w-[200px]">{pack?.name}</h1>
                    {cheatCount > 0 && (
                        <Badge variant="destructive" className="animate-pulse">
                            <ShieldAlert className="w-3 h-3 mr-1" /> Flags: {cheatCount}
                        </Badge>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="text-xs">
                        {Object.keys(answers).length}/{questions.length}
                    </Badge>
                    <Badge variant={timeLeft < 300 ? 'destructive' : 'secondary'} className="font-mono text-sm">
                        <Clock className="w-4 h-4 mr-1" />
                        <SlidingNumber value={Math.floor(timeLeft / 60)} padStart />:<SlidingNumber value={timeLeft % 60} padStart />
                    </Badge>

                    <Button variant="ghost" size="icon" onClick={enterFullscreen} title="Enter Fullscreen">
                        <Maximize className="w-5 h-5" />
                    </Button>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowLogoutConfirm(true)}
                        className="hover:text-destructive hover:bg-destructive/10"
                        title="Save & Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </header>

            {/* Question Number Navigation */}
            <div className="bg-card border-b px-2 sm:px-4 py-2 shrink-0 overflow-y-auto max-h-28 sm:max-h-32">
                <div className="flex flex-wrap gap-1.5 sm:gap-2 py-1 px-1">
                    {questions.map((q, i) => {
                        const isCurrent = i === currentIndex;
                        const isAnswered = !!answers[q.id];
                        return (
                            <Button
                                key={q.id}
                                variant="ghost"
                                size="icon"
                                onClick={() => setCurrentIndex(i)}
                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 border-2 ${isCurrent
                                    ? 'bg-primary text-primary-foreground border-primary shadow-md scale-110 hover:bg-primary/90'
                                    : isAnswered
                                        ? 'bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/50 hover:bg-green-500/25 hover:border-green-500'
                                        : 'bg-muted/50 text-muted-foreground border-transparent hover:border-muted-foreground/30 hover:bg-muted'
                                    }`}
                            >
                                {i + 1}
                            </Button>
                        );
                    })}
                </div>
            </div>

            {/* Main Content Area */}
            <div ref={quizContentRef} className="flex-1 flex overflow-hidden">
                {hasStimulus && (
                    <div className="hidden lg:block w-1/2 p-8 overflow-y-auto bg-muted/30 border-r">
                        <Card className="min-h-full">
                            <CardHeader>
                                <CardDescription className="uppercase tracking-widest text-xs font-bold">Stimulus Material</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="quiz-scale-area overflow-hidden">
                                    <div className="quiz-content prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: formatQuizContent(currentQ.stimulus || '') }} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <div className={`flex-1 flex flex-col h-full overflow-hidden relative ${hasStimulus ? 'lg:w-1/2' : 'w-full max-w-4xl mx-auto'}`}>
                    <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 sm:p-8">
                        {hasStimulus && (
                            <Alert className="lg:hidden mb-6 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 overflow-hidden">
                                <AlertDescription className="min-w-0 overflow-hidden">
                                    <div className="mobile-stimulus">
                                        <div className="quiz-scale-area overflow-hidden">
                                            <div className="quiz-content prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: formatQuizContent(currentQ.stimulus || '') }} />
                                        </div>
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}

                        <Card className="overflow-hidden">
                            <CardHeader>
                                <Badge variant="secondary" className="w-fit mb-2">Question {currentIndex + 1}</Badge>
                                {/* quiz-scale-area: overflow:hidden gives JS the true available width
                                    and clips any overflow after the scale transform */}
                                <div className="quiz-scale-area overflow-hidden">
                                    <div className="text-lg font-medium leading-relaxed prose dark:prose-invert max-w-none quiz-content quiz-question-content" dangerouslySetInnerHTML={{ __html: formatQuizContent(currentQ.text) }} />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <RadioGroup
                                    value={answers[currentQ.id] || ''}
                                    onValueChange={handleSelect}
                                    className="space-y-3"
                                >
                                    {(currentQ.options as string[]).map((opt, idx) => {
                                        const isSelected = answers[currentQ.id] === opt;
                                        const optionLabel = String.fromCharCode(65 + idx);
                                        return (
                                            <div key={idx} className="min-w-0">
                                                <Label
                                                    htmlFor={`option-${idx}`}
                                                    className={`flex items-start gap-2 sm:gap-4 py-3 px-2 sm:p-4 rounded-xl border-2 cursor-pointer transition-all leading-normal ${isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'}`}
                                                >
                                                    {/* Hide Radix radio visually — it still handles keyboard/a11y */}
                                                    <RadioGroupItem value={opt} id={`option-${idx}`} className="sr-only" />
                                                    {/* Single circle — letter + selected ring, always same size */}
                                                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-xs font-bold shrink-0 mt-0.5 border-2 transition-colors ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'bg-muted border-transparent text-muted-foreground'}`}>
                                                        {optionLabel}
                                                    </div>
                                                    <div className="quiz-scale-area flex-1 min-w-0 overflow-hidden">
                                                        <div className="prose prose-sm dark:prose-invert max-w-none select-none quiz-content quiz-option-content" dangerouslySetInnerHTML={{ __html: formatQuizContent(opt) }} />
                                                    </div>
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </RadioGroup>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Footer Nav */}
                    <div className="bg-card border-t p-4 flex justify-between shrink-0">
                        <Button
                            variant="ghost"
                            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                            disabled={currentIndex === 0}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Previous
                        </Button>

                        {currentIndex === questions.length - 1 ? (
                            <Button onClick={() => setShowSubmitConfirm(true)}>
                                Finish Exam <Flag className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button onClick={() => setCurrentIndex(prev => prev + 1)}>
                                Next <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};