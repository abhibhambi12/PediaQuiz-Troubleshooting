// /PediaQuiz/src/vite-env.d.ts

/// <reference types="vite/client" />

// All your type definitions are now here and will be available globally.

export interface MCQ {
  id: string;
  question: string;
  options: string[];
  answer: string;
  explanation: string;
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

// ... and so on for ALL your other types (Topic, Chapter, AppData, etc.) ...