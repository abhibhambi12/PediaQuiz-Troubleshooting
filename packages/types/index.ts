// packages/types/index.ts

// The 'export' keyword makes this file a module and makes the interface available for import.
export interface MCQ {
  id: string;
  question: string;
  options: string[];
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  topic: string;
  chapter: string;
  sourceJobId?: string;
  createdAt?: any;
}

// The 'export' keyword is also needed here.
export interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  chapter: string;
  sourceJobId?: string;
  createdAt?: any;
}