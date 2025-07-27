import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import type { Topic, MCQ, Flashcard, AwaitingReviewData, AttemptedMCQs } from '@pediaquiz/types';

// --- STUDENT-FACING FEATURES ---
// Updated interface to include mcqId for caching on the backend
interface MCQDetailsForExplanation {
  mcqId: string; // Add mcqId for caching
  question: string;
  options: string[];
  answer: string;
}
export async function getMCQExplanation(mcq: MCQDetailsForExplanation): Promise<string> {
  try {
    // Pass mcqId along with other MCQ details to the callable function
    const callable = httpsCallable<MCQDetailsForExplanation, { explanation: string }>(functions, "generateMCQExplanation");
    const result = await callable(mcq);
    return result.data.explanation;
  } catch (error: any) {
    throw new Error(error.message || "Failed to get explanation from AI.");
  }
}

interface PerformanceData {
  strongTopics: string[];
  weakTopics: string[];
  overallAccuracy: number;
}
export async function getPerformanceAdvice(data: PerformanceData): Promise<string> {
  try {
    const callable = httpsCallable<PerformanceData, { advice: string }>(functions, "generatePerformanceAdvice");
    const result = await callable(data);
    return result.data.advice;
  } catch (error: any) {
    throw new Error(error.message || "Failed to get performance advice.");
  }
}

// --- ADMIN FEATURES ---
export async function suggestMetrics(sourceText: string): Promise<{ suggestedMcqCount: number; suggestedFlashcardCount: number }> {
    try {
        const callable = httpsCallable<{ sourceText: string }, { suggestedMcqCount: number; suggestedFlashcardCount: number }>(functions, 'suggestContentMetrics');
        const result = await callable({ sourceText });
        return result.data;
    } catch (error: any) {
        throw new Error(error.message || "Failed to get AI suggestions.");
    }
}
interface GeneratePayload { sourceText: string; existingTopics: Topic[]; mcqCount: number; flashcardCount: number; }
export async function generateContent(payload: GeneratePayload): Promise<AwaitingReviewData> {
    try {
        const callable = httpsCallable<GeneratePayload, AwaitingReviewData>(functions, 'generateAndClassifyContent');
        const result = await callable(payload);
        return result.data;
    } catch (error: any) {
        throw new Error(error.message || "Failed to generate content.");
    }
}
interface ApprovePayload { uploadId: string; approvedMcqs: Omit<MCQ, 'id' | 'topic' | 'chapter'>[]; approvedFlashcards: Omit<Flashcard, 'id'|'topic'|'chapter'>[]; topic: string; chapter: string; }
export async function approveContent(payload: ApprovePayload): Promise<{ success: boolean; message: string }> {
    try {
        const callable = httpsCallable<ApprovePayload, { success: boolean, message: string }>(functions, 'approveAndSaveContent');
        const result = await callable(payload);
        return result.data;
    } catch (error: any) {
        throw new Error(error.message || "Failed to save content.");
    }
}
export async function grantAdminRole(uid: string): Promise<{ success: boolean; message: string }> {
    try {
        const callable = httpsCallable<{ uidToMakeAdmin: string }, { success: boolean, message: string }>(functions, 'setAdminRole');
        const result = await callable({ uidToMakeAdmin: uid });
        return result.data;
    } catch (error: any) {
        throw new Error(error.message || "Failed to grant admin role.");
    }
}
export async function deleteContentItem(id: string, type: 'mcq' | 'flashcard'): Promise<{ success: boolean; message: string }> {
    try {
        const callable = httpsCallable<{ id: string, type: string }, { success: boolean, message: string }>(functions, 'deleteContentItem');
        const result = await callable({ id, type });
        return result.data;
    } catch (error: any) {
        throw new Error(error.message || `Failed to delete ${type}.`);
    }
}

export async function generateWeaknessTest(attempted: AttemptedMCQs, allMcqs: MCQ[], testSize: number): Promise<{ mcqIds: string[] }> {
    try {
        const callable = httpsCallable<any, { mcqIds: string[] }>(functions, 'generateWeaknessBasedTest');
        const result = await callable({ attempted, allMcqs, testSize });
        return result.data;
    } catch (error: any) {
        throw new Error(error.message || "Failed to generate weakness-based test.");
    }
}