export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER'
}

export interface ClassGroup {
  id: string;
  name: string; // e.g. "12 IPA 1"
}

export interface User {
  id: string;
  username: string; // Login ID (NIS/Username)
  fullName?: string; // Real Name (Nama Siswa)
  absentNumber?: string; // No Absen
  passwordHash: string;
  role: Role;
  classId?: string; // Optional for Admin
  maxAttempts: number;
  currentAttempts: number;
  profileImage?: string;
}

// Session-safe subset of User (no sensitive/server-only fields)
export type SessionUser = Omit<User, 'passwordHash' | 'maxAttempts' | 'currentAttempts'> & {
  className?: string; // Resolved class name from session
};

export interface QuizPack {
  id: string;
  name: string;
  isActive: boolean;
  timeLimit: number; // in minutes
  token: string; // Exam Token
  allowedClassIds: string[]; // Which classes can take this
  randomizeQuestions: boolean;
  randomizeOptions: boolean;

  // New Scheduling & Security Features
  scheduleStart?: string; // ISO Date String
  scheduleEnd?: string;   // ISO Date String
  autoRotateToken?: boolean; // If true, token changes every 5 mins
  lastTokenUpdate?: number; // Timestamp of last token change
}

export interface Question {
  id: string;
  packId: string;
  variant: string;
  text: string; // Rich Text (HTML)
  stimulus?: string; // Rich Text (HTML) for grouped questions (Wacana)
  imageUrl?: string;
  options: string[]; // Rich Text (HTML) strings
  correctAnswer: string; // The HTML string of the correct answer
}

export interface Result {
  id: string;
  userId: string;
  username: string;
  classId?: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  packName: string;
  variant: string;
  timestamp: string;
  cheatCount: number; // Number of tab switches/blur events
}

// Live Monitoring Session
export interface ExamSession {
  userId: string;
  username: string;
  fullName: string;
  classId?: string;
  packId: string;
  packName: string;
  variant: string; // To ensure they get the same questions on resume
  startTime: number;
  lastUpdate: number; // Timestamp for "Online" status
  currentQuestionIndex: number;
  answeredCount: number;
  answers: Record<string, string>; // Saved answers
  totalQuestions: number;
  cheatCount: number;
}

export interface AppState {
  currentUser: User | null;
  view: 'LOGIN' | 'DASHBOARD' | 'QUIZ' | 'RESULT';
  lastResult: Result | null;
}

// For Analysis
export interface QuestionAnalysis {
  questionId: string;
  text: string;
  attempts: number;
  correctCount: number;
  difficultyIndex: number; // 0-1 (1 = everyone got it right)
}

// Derived type for Role enum values
export type RoleType = `${Role}`;

// --- Server Action Input Types (SUG-3: replace `any` params) ---

export interface CreateUserInput {
  id?: string;
  username: string;
  fullName?: string;
  absentNumber?: string;
  password: string;
  role: Role | RoleType;
  classId?: string | null;
  maxAttempts?: number;
  currentAttempts?: number;
}

export interface CreatePackInput {
  id?: string;
  name: string;
  timeLimit: number;
  token: string;
  allowedClassIds?: string[];
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  autoRotateToken?: boolean;
  scheduleStart?: string;
  scheduleEnd?: string;
  lastTokenUpdate?: Date;
}

export interface UpdatePackInput extends Partial<CreatePackInput> {
  id: string;
}

export interface CreateQuestionInput {
  id?: string;
  packId: string;
  variant: string;
  text: string;
  stimulus?: string | null;
  imageUrl?: string | null;
  options: string[];
  correctAnswer: string;
}

export interface UpdateQuestionInput extends Partial<CreateQuestionInput> {
  id: string;
}

export interface SubmitQuizInput {
  userId: string;
  packId: string;
  cheatCount: number;
  answers: Record<string, string>;
}