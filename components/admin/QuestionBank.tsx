'use client';

import React from 'react';
import { Question, QuizPack } from '@/types';
import { RichTextEditor } from './RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Edit2, Save, Sparkles } from 'lucide-react';

interface QuestionBankProps {
    packs: QuizPack[];
    questions: Question[];
    manualPackId: string;
    setManualPackId: (v: string) => void;
    editingId: string | null;
    manualQ: Partial<Question>;
    setManualQ: (v: any) => void;
    genTopic: string;
    setGenTopic: (v: string) => void;
    genVariant: string;
    setGenVariant: (v: string) => void;
    isGenerating: boolean;
    questionVariantFilter: string;
    setQuestionVariantFilter: (v: string) => void;
    showQuickPackModal: boolean;
    setShowQuickPackModal: (v: boolean) => void;
    packForm: Partial<QuizPack>;
    setPackForm: (v: any) => void;
    handleSaveQuestion: () => void;
    handleDeleteQuestion: (id: string) => void;
    handleStartEdit: (q: Question) => void;
    handleGenerateAI: () => void;
    handleSavePack: () => void;
    resetManualForm: () => void;
}

export const QuestionBank: React.FC<QuestionBankProps> = ({
    packs, questions, manualPackId, setManualPackId, editingId, manualQ, setManualQ,
    genTopic, setGenTopic, genVariant, setGenVariant, isGenerating,
    questionVariantFilter, setQuestionVariantFilter,
    showQuickPackModal, setShowQuickPackModal, packForm, setPackForm,
    handleSaveQuestion, handleDeleteQuestion, handleStartEdit, handleGenerateAI, handleSavePack, resetManualForm
}) => {
    return (
        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="flex-1 w-full space-y-2">
                            <Label>Select Pack to Manage</Label>
                            <div className="flex gap-2">
                                <Select value={manualPackId} onValueChange={setManualPackId}>
                                    <SelectTrigger><SelectValue placeholder="-- Select Exam Pack --" /></SelectTrigger>
                                    <SelectContent>
                                        {packs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Button variant="outline" size="icon" onClick={() => setShowQuickPackModal(true)}>
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex-[2] w-full flex gap-4 items-end">
                            <div className="flex-1 space-y-2">
                                <Label>AI Generator Topic</Label>
                                <div className="relative">
                                    <Sparkles className="absolute left-3 top-3 w-5 h-5 text-primary animate-pulse" />
                                    <Input value={genTopic} onChange={e => setGenTopic(e.target.value)} placeholder="e.g. 'Demand and Supply'" className="pl-10" />
                                </div>
                            </div>
                            <div className="w-24 space-y-2">
                                <Label>Variant</Label>
                                <Select value={genVariant} onValueChange={setGenVariant}>
                                    <SelectTrigger className="font-bold text-center">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['A', 'B', 'C', 'D', 'E'].map(v => (
                                            <SelectItem key={v} value={v}>{v}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button onClick={handleGenerateAI} disabled={isGenerating || !genTopic}>
                                {isGenerating ? 'Generating...' : 'Generate'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Edit2 className="w-5 h-5 text-primary" />
                        {editingId ? 'Edit Question' : 'Manual Input'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Stimulus (Wacana/Case Study)</Label>
                        <RichTextEditor value={manualQ.stimulus || ''} onChange={val => setManualQ({ ...manualQ, stimulus: val })} placeholder="Optional case study text or reading passage..." />
                        <p className="text-[10px] text-muted-foreground">Leave empty if not part of a question group.</p>
                    </div>

                    <div className="space-y-2">
                        <Label>Question Stem</Label>
                        <RichTextEditor value={manualQ.text || ''} onChange={val => setManualQ({ ...manualQ, text: val })} placeholder="Type the main question here..." />
                    </div>


                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <Label>Pack</Label>
                            <Select value={manualPackId} onValueChange={setManualPackId}>
                                <SelectTrigger><SelectValue placeholder="-- Select --" /></SelectTrigger>
                                <SelectContent>
                                    {packs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-32 space-y-2">
                            <Label>Variant</Label>
                            <Input value={manualQ.variant} onChange={e => setManualQ({ ...manualQ, variant: e.target.value.toUpperCase() })} maxLength={1} className="text-center font-bold" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Answer Options</Label>
                        <div className="space-y-4">
                            {['A', 'B', 'C', 'D', 'E'].map((lbl, idx) => (
                                <div key={idx} className="border rounded-lg p-3 bg-muted/30 relative">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-bold text-muted-foreground">{lbl}.</span>
                                        <Checkbox
                                            checked={manualQ.correctAnswer === (manualQ.options ? manualQ.options[idx] : '') && manualQ.options?.[idx] !== ''}
                                            onCheckedChange={() => setManualQ({ ...manualQ, correctAnswer: manualQ.options![idx] })}
                                            title="Mark as Correct Answer"
                                        />
                                    </div>
                                    <RichTextEditor
                                        value={manualQ.options![idx]}
                                        onChange={val => {
                                            const newOpts = [...manualQ.options!];
                                            newOpts[idx] = val;
                                            setManualQ({ ...manualQ, options: newOpts });
                                        }}
                                        onPasteMultipleOptions={(parsed) => {
                                            const newOpts = ['', '', '', '', ''];
                                            parsed.forEach((opt, i) => {
                                                if (i < 5) newOpts[i] = opt;
                                            });
                                            setManualQ({ ...manualQ, options: newOpts });
                                        }}
                                        placeholder={`Option ${lbl}...`}
                                        minHeight="60px"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <Button onClick={handleSaveQuestion} className="w-full" size="lg">
                        {editingId ? <><Save className="w-4 h-4 mr-2" /> Update Question</> : <><Plus className="w-4 h-4 mr-2" /> Add Question</>}
                    </Button>
                    {editingId && (
                        <Button variant="ghost" onClick={resetManualForm} className="w-full">Cancel Edit</Button>
                    )}
                </CardContent>
            </Card>

            {manualPackId && (() => {
                const packQuestions = questions.filter(q => q.packId === manualPackId);
                const availableVariants = [...new Set(packQuestions.map(q => q.variant))].sort();
                const filteredQuestions = questionVariantFilter === 'ALL'
                    ? packQuestions
                    : packQuestions.filter(q => q.variant === questionVariantFilter);
                return (
                    <div className="space-y-4">
                        {/* Variant Filter Tabs */}
                        {availableVariants.length > 0 && (
                            <Card>
                                <CardContent className="pt-4 pb-3">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-medium text-muted-foreground mr-1">Variant:</span>
                                        <Button
                                            size="sm"
                                            variant={questionVariantFilter === 'ALL' ? 'default' : 'outline'}
                                            onClick={() => setQuestionVariantFilter('ALL')}
                                            className="h-8"
                                        >
                                            Semua ({packQuestions.length})
                                        </Button>
                                        {availableVariants.map(v => {
                                            const count = packQuestions.filter(q => q.variant === v).length;
                                            return (
                                                <Button
                                                    key={v}
                                                    size="sm"
                                                    variant={questionVariantFilter === v ? 'default' : 'outline'}
                                                    onClick={() => setQuestionVariantFilter(v)}
                                                    className="h-8"
                                                >
                                                    Variant {v} ({count})
                                                </Button>
                                            );
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                        {filteredQuestions.map((q, idx) => (
                            <Card key={q.id} className="group hover:border-primary transition-all">
                                <CardContent className="pt-6">
                                    <div className="flex justify-between items-start">
                                        <div className="flex gap-4">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                                                <Badge variant="secondary">{q.variant}</Badge>
                                            </div>
                                            <div className="flex-1">
                                                {q.stimulus && (
                                                    <div className="mb-2 p-3 bg-muted border-l-4 border-border text-sm text-muted-foreground italic rounded-r">
                                                        <div dangerouslySetInnerHTML={{ __html: q.stimulus.substring(0, 150) + '...' }} />
                                                    </div>
                                                )}

                                                <div className="font-medium mb-3 question-preview" dangerouslySetInnerHTML={{ __html: q.text }} />
                                                <div className="flex flex-wrap gap-2">
                                                    {(q.options as string[]).map((opt, i) => (
                                                        <Badge key={i} variant={opt === q.correctAnswer ? "default" : "secondary"}>
                                                            Option {['A', 'B', 'C', 'D', 'E'][i]}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => handleStartEdit(q)} className="hover:text-amber-500">
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(q.id)} className="hover:text-destructive">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {questions.filter(q => q.packId === manualPackId).length === 0 && (
                            <Card className="border-dashed">
                                <CardContent className="text-center py-12 text-muted-foreground">
                                    No questions in this pack yet. Add manually or use AI.
                                </CardContent>
                            </Card>
                        )}
                    </div>
                );
            })()}

            {/* Quick Pack Modal */}
            <Dialog open={showQuickPackModal} onOpenChange={setShowQuickPackModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Exam Pack</DialogTitle>
                    </DialogHeader>
                    <Input value={packForm.name} onChange={e => setPackForm({ ...packForm, name: e.target.value })} placeholder="Exam Name" />
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setShowQuickPackModal(false)}>Cancel</Button>
                        <Button onClick={handleSavePack}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
