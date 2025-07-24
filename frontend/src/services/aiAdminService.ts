// --- START OF FILE src/services/aiAdminService.ts ---

import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import type { Topic, MCQ, Flashcard } from '@/types.ts';

export async function suggestMetrics(sourceText: string): Promise<{ suggestedMcqCount: number; suggestedFlashcardCount: number }> {
    try {
        const suggestCallable = httpsCallable< { sourceText: string }, { suggestedMcqCount: number; suggestedFlashcardCount: number }>(functions, 'suggestContentMetrics');
        const result = await suggestCallable({ sourceText });
        return result.data;
    } catch (error: any) {
        console.error("Error calling suggestContentMetrics:", error);
        throw new Error(error.message || "Failed to get AI suggestions.");
    }
}

interface GeneratePayload {
    sourceText: string;
    existingTopics: Topic[];
    mcqCount: number;
    flashcardCount: number;
}
interface GenerateResponse {
    suggestedTopic: string;
    suggestedChapter: string;
    isNewChapterSuggestion: boolean;
    mcqs: Omit<MCQ, 'id'|'topic'|'chapter'>[];
    flashcards: Flashcard[];
}
export async function generateContent(payload: GeneratePayload): Promise<GenerateResponse> {
    try {
        const generateCallable = httpsCallable<GeneratePayload, GenerateResponse>(functions, 'generateAndClassifyContent');
        const result = await generateCallable(payload);
        return result.data;
    } catch (error: any) {
        console.error("Error calling generateAndClassifyContent:", error);
        throw new Error(error.message || "Failed to generate content.");
    }
}

interface ApprovePayload {
    uploadId: string;
    approvedMcqs: Omit<MCQ, 'id'|'topic'|'chapter'>[];
    approvedFlashcards: Flashcard[];
    topic: string;
    chapter: string;
}
export async function approveContent(payload: ApprovePayload): Promise<{ success: boolean; message: string }> {
    try {
        const approveCallable = httpsCallable<ApprovePayload, { success: boolean, message: string }>(functions, 'approveAndSaveContent');
        const result = await approveCallable(payload);
        return result.data;
    } catch (error: any) {
        console.error("Error calling approveAndSaveContent:", error);
        throw new Error(error.message || "Failed to save content.");
    }
}
// --- END OF FILE src/services/aiAdminService.ts ---