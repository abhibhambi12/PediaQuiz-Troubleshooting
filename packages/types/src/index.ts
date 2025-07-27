// All application types are defined here.

export interface MCQ {
  id: string;
  question: string;
  options: string[];
  answer: string;
  explanation?: string; // Made optional for caching implementation
  chapter: string;
  topic: string;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  chapter: string;
}

export interface Chapter {
  id: string;
  name: string;
  mcqCount: number;
}

export interface Topic {
  id: string;
  name: string;
  chapters: Chapter[];
  chapterCount: number;
  totalMcqCount: number;
}

export interface AppData {
  topics: Topic[];
  mcqs: MCQ[];
  flashcards: Flashcard[];
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAdmin: boolean;
}

export interface UserUpload {
  id: string;
  uid: string;
  fileName: string;
  originalFilePath: string;
  extractedText: string;
  status: "processed" | "generating-metrics" | "pending-generation" |
          "generating-content" | "pending-review" | "complete" | "error" | "pending_ocr";
  createdAt: any;
  error?: string;
}

export interface AwaitingReviewData {
    suggestedTopic: string;
    suggestedChapter: string;
    isNewChapterSuggestion: boolean;
    mcqs: Omit<MCQ, 'id' | 'topic' | 'chapter'>[];
    flashcards: Omit<Flashcard, 'id' | 'topic' | 'chapter'>[];
}

export interface QuestionResult {
  mcqId: string;
  isCorrect: boolean;
  selectedAnswer: string | null;
  correctAnswer: string;
}

export interface QuizResult {
  id: string;
  date: string;
  chapterId: string;
  score: number;
  totalQuestions: number;
  results: QuestionResult[];
  rawScore?: number;
}

export type AttemptedMCQs = Record<string, {
  isCorrect: boolean;
  selectedAnswer?: string | null;
  incorrectStreak?: number;
  lastSeen?: number;
}>;

export type Theme = 'light' | 'dark';

export interface DebugLog {
  timestamp: string;
  step: string;
  status: 'pending' | 'success' | 'error';
  data?: any;
}

export interface DebugData {
  rawTopicsFromFirestore?: any[];
  rawMcqsFromFirestore?: any[];
  processedAppData?: AppData;
  errorMessage?: string;
}

export interface DataContextType {
  data: AppData | null;
  loading: boolean;
  error: string | null;
  debugData: DebugData | null;
  bookmarks: string[];
  toggleBookmark: (mcqId: string) => void;
  quizHistory: QuizResult[];
  addQuizResult: (result: Omit<QuizResult, 'id' | 'date'>) => void;
  attempted: AttemptedMCQs;
  addAttempt: (mcqId: string, isCorrect: boolean, selectedOption: string | null) => void;
  resetProgress: () => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  refreshData: () => Promise<void>;
  user: AppUser | null;
  authLoading: boolean;
  logout: () => Promise<void>;
  debugLog: DebugLog[];
  addDebugLog: (step: string, status: 'pending' | 'success' | 'error', data?: any) => void;
  showDebug: boolean;
  toggleDebug: () => void;
  refreshIdToken: () => Promise<void>;
  grantAdmin: (uid: string) => Promise<void>;
}
export type RawTopicChapter = string;