export enum TaskPriority {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW"
}

export enum StudyMode {
  SUMMARY = "SUMMARY",
  QUIZ = "QUIZ",
  CHAT = "CHAT",
  ANALYSIS = "ANALYSIS"
}

export enum QuestionType {
  MULTIPLE_CHOICE = "multiple-choice",
  SHORT_ANSWER = "short-answer"
}

export interface DocumentItem {
  id: string;
  title: string;
  content: string;
  folderId: string | null; // null for Root
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isEncrypted: boolean;
}

export interface FolderItem {
  id: string;
  name: string;
  createdAt: number;
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: QuestionType;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface QuizSession {
  documentId: string;
  questions: QuizQuestion[];
  currentQuestionIndex: number;
  userAnswers: { [questionId: string]: string };
  score: number | null;
  isCompleted: boolean;
}

export interface ProactiveTask {
  id: string;
  title: string;
  description: string;
  dueDate: string; // ISO string or YYYY-MM-DD
  dueTime: string; // HH:MM
  priority: TaskPriority;
  category: string; // e.g., 'Exam', 'Assignment', 'Reading'
  status: "pending" | "completed" | "overdue";
  reminded: boolean;
  studyHoursRequired: number;
  progress: number; // 0 to 100
}

export interface StudyStreak {
  streak: number;
  lastStudyDate: string; // YYYY-MM-DD
  totalMinutes: number;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: number;
  type: "warning" | "info" | "success" | "alert";
  read: boolean;
}
