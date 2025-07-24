// --- START OF FILE src/services/aiStudentService.ts ---

import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

interface MCQDetailsForExplanation {
  question: string;
  options: string[];
  answer: string;
}

export async function getMCQExplanation(mcq: MCQDetailsForExplanation): Promise<string> {
  try {
    const generateExplanationCallable = httpsCallable<MCQDetailsForExplanation, { explanation: string }>(functions, "generateMCQExplanation");
    const result = await generateExplanationCallable(mcq);
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
    const generateAdviceCallable = httpsCallable<PerformanceData, { advice: string }>(functions, "generatePerformanceAdvice");
    const result = await generateAdviceCallable(data);
    return result.data.advice;
  } catch (error: any) {
    throw new Error(error.message || "Failed to get performance advice.");
  }
}
// --- END OF FILE src/services/aiStudentService.ts ---