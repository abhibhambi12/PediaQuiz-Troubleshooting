import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {VertexAI} from "@google-cloud/vertexai";
// FIX: Ensure only necessary types are imported.
import type { MCQ, Flashcard, Topic, Chapter } from "@pediaquiz/types";


admin.initializeApp();
const log = functions.logger;
const MODEL_NAME = "gemini-2.0-flash-001";

const CORS_OPTIONS = {
  cors: [
    /https:\/\/.*\.app\.github\.dev/,
    /http:\/\/localhost:[0-9]+/,
    "https://pediaquiz.netlify.app",
    "https://pediaquiz-app.web.app",
  ],
};

// --- CORE APP FUNCTIONS ---
export const helloWorld = onCall(CORS_OPTIONS, (request: CallableRequest) => {
  log.info("Executing helloWorld with input:", request.data);
  const name = request.data.name || "world";
  return {greeting: `Hello, ${name}. The backend is stable.`};
});

// Admin Function: Set Admin Role
export const setAdminRole = onCall(CORS_OPTIONS, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  // IMPORTANT: For initial setup, use your Firebase Auth UID here if you are the first admin.
  // After setup, you might want to manage admins differently.
  const SUPER_ADMIN_UID = "hzy8IULluOfxqnEIR3nQ731MI5w1"; // REPLACE THIS WITH YOUR ACTUAL ADMIN UID FOR FIRST TIME SETUP
  const isSuperAdmin = request.auth.uid === SUPER_ADMIN_UID;
  const isExistingAdmin = !!request.auth.token.isAdmin;

  if (!isSuperAdmin && !isExistingAdmin) {
    throw new HttpsError("permission-denied", "Not authorized to set admin roles.");
  }

  const {uidToMakeAdmin} = request.data;
  if (typeof uidToMakeAdmin !== "string" || !uidToMakeAdmin.length) {
    throw new HttpsError("invalid-argument", "UID is required to grant admin role.");
  }

  try {
    await admin.auth().setCustomUserClaims(uidToMakeAdmin, {isAdmin: true});
    // Optionally, store admin status in Firestore for easier querying/display
    await admin.firestore().collection("users").doc(uidToMakeAdmin)
      .set({isAdmin: true}, {merge: true});
    log.info(`Admin role granted to UID: ${uidToMakeAdmin} by ${request.auth.uid}`);
    return {
      success: true,
      message: `Admin role granted to UID: ${uidToMakeAdmin}.`,
    };
  } catch (error: unknown) {
    const err = error as Error;
    log.error("Error setting admin role:", err);
    throw new HttpsError("internal", err.message);
  }
});

// Admin Function: Delete Content Item (MCQ or Flashcard)
export const deleteContentItem = onCall(CORS_OPTIONS, async (request: CallableRequest) => {
  if (!request.auth?.token.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required to delete content.");
  }
  const {id, type} = request.data;
  if (!id || typeof id !== "string" || !["mcq", "flashcard"].includes(type)) {
    throw new HttpsError("invalid-argument", "Valid ID and type ('mcq' or 'flashcard') required for deletion.");
  }
  const collectionRef = type === "mcq" ?
    admin.firestore().collection("MasterMCQ") :
    admin.firestore().collection("Flashcards");

  try {
    await collectionRef.doc(id).delete();
    log.info(`Admin ${request.auth.uid} deleted ${type} ${id}`);
    return {success: true, message: `Successfully deleted ${type} ${id}`};
  } catch (error: unknown) {
    const err = error as Error;
    log.error(`Error deleting ${type} ${id}:`, err);
    throw new HttpsError("internal", err.message);
  }
});

// Student/User Function: Generate or Fetch MCQ Explanation (with caching)
export const generateMCQExplanation = onCall(
  CORS_OPTIONS,
  async (request: CallableRequest) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in to generate explanations.");
    }
    // Added mcqId to request data for caching
    const {mcqId, question, options, answer} = request.data;

    // Validate inputs
    const optionsAreValid = options.every(
      (opt: unknown) => typeof opt === "string" && opt.length > 0
    );
    const isValidMCQ =
    typeof question === "string" && !!question &&
    Array.isArray(options) && options.length === 4 &&
    optionsAreValid &&
    typeof answer === "string" && ["A", "B", "C", "D"].includes(answer);
    
    // Validate mcqId presence and type
    if (!isValidMCQ || typeof mcqId !== "string" || !mcqId) {
      throw new HttpsError("invalid-argument", "Invalid MCQ data or ID provided.");
    }

    const mcqRef = admin.firestore().collection("MasterMCQ").doc(mcqId);

    try {
      // 1. Check if explanation already exists in Firestore for this MCQ
      const docSnap = await mcqRef.get();
      if (docSnap.exists && docSnap.data()?.explanation) {
        log.info(`[MCQ Explanation] Serving cached explanation for MCQ: ${mcqId}`);
        // Return existing explanation if found
        return { explanation: docSnap.data()!.explanation };
      }

      // 2. If not found, generate using AI
      const vertexAi = new VertexAI({
        project: process.env.GCLOUD_PROJECT,
        location: "us-central1",
      });
      const generativeModel = vertexAi.getGenerativeModel({model: MODEL_NAME});
      const optionsText = options
        .map((opt: string, index: number) =>
          `${String.fromCharCode(65 + index)}. ${opt}`)
        .join("\n");
      const prompt = `You are a concise pediatric medical expert.
Explain this MCQ. Structure:
**Correct Answer Explanation:** [Explain why.]
**Incorrect Options Explanation:** [Briefly explain why each is wrong.]
Question: ${question}
Options:\n${optionsText}
Correct Answer: ${answer}\n\n
Provide your explanation without conversational filler.`;

      log.info(`[MCQ Explanation] Generating new explanation for MCQ: ${mcqId}`);
      const resp = await generativeModel.generateContent(
        {contents: [{role: "user", parts: [{text: prompt}]}]}
      );
      const explanation = resp.response.candidates?.[0]?.
        content?.parts?.[0]?.text || "No explanation generated.";

      // 3. Save the newly generated explanation back to Firestore
      await mcqRef.update({ explanation: explanation });
      log.info(`[MCQ Explanation] Saved new explanation for MCQ: ${mcqId}`);

      return {explanation};
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error.";
      log.error(`Error in generateMCQExplanation for MCQ ${mcqId}:`, err);
      throw new HttpsError("internal", "AI Error: " + errorMessage);
    }
  }
);

export const generatePerformanceAdvice = onCall(
  CORS_OPTIONS,
  async (request: CallableRequest) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in to get performance advice.");
    }
    const {strongTopics, weakTopics, overallAccuracy} = request.data;
    if (
      !Array.isArray(strongTopics) ||
    !Array.isArray(weakTopics) ||
    typeof overallAccuracy !== "number"
    ) {
      throw new HttpsError("invalid-argument", "Invalid performance data provided for advice generation.");
    }
    try {
      const vertexAi = new VertexAI({
        project: process.env.GCLOUD_PROJECT, location: "us-central1",
      });
      const generativeModel = vertexAi.getGenerativeModel({model: MODEL_NAME});
      const prompt = `You are an encouraging medical study advisor.
User's performance:
- Accuracy: ${overallAccuracy.toFixed(1)}%
- Strong Topics: ${strongTopics.join(", ") || "None yet"}
- Weak Topics: ${weakTopics.join(", ") || "None yet"}
Provide short, actionable advice in markdown with two sections:
**Areas to Consolidate** and **Areas for Revision**.
Keep it under 150 words.`;
      const resp = await generativeModel.generateContent(
        {contents: [{role: "user", parts: [{text: prompt}]}]}
      );
      const advice = resp.response.candidates?.[0]?.
        content?.parts?.[0]?.text || "Could not generate advice.";
      return {advice};
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error.";
      log.error("Error getting advice:", err);
      throw new HttpsError("internal", "AI Error: " + errorMessage);
    }
  }
);

export const generateWeaknessBasedTest = onCall(
  CORS_OPTIONS,
  async (request: CallableRequest) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required to generate weakness test.");
    }
    const {attempted, allMcqs, testSize = 20} = request.data;
    if (!attempted || !Array.isArray(allMcqs) || allMcqs.length === 0) {
      throw new HttpsError(
        "invalid-argument", "Performance data and MCQs are required to generate test."
      );
    }
    const chapterStats: Record<string,
      { correct: number, total: number, accuracy: number }> = {};

    for (const mcqId in attempted) {
      if (Object.prototype.hasOwnProperty.call(attempted, mcqId)) {
        const mcq = allMcqs.find((m: MCQ) => m.id === mcqId);
        if (mcq && mcq.chapter) {
          const chapter = mcq.chapter;
          if (!chapterStats[chapter]) {
            chapterStats[chapter] = {correct: 0, total: 0, accuracy: 0};
          }
          chapterStats[chapter].total++;
          if (attempted[mcqId].isCorrect) {
            chapterStats[chapter].correct++;
          }
        }
      }
    }

    Object.keys(chapterStats).forEach((chapter) => {
      const stats = chapterStats[chapter];
      stats.accuracy = (stats.correct / stats.total) * 100;
    });

    const sortedChapters = Object.keys(chapterStats)
      .sort((a, b) => chapterStats[a].accuracy - chapterStats[b].accuracy);
    const questionPool: string[] = [];
    // Prioritize questions from weaker chapters
    for (const chapter of sortedChapters) {
      const chapterMcqs = allMcqs
        .filter((m: MCQ) => m.chapter === chapter).map((m: MCQ) => m.id);
      questionPool.push(...chapterMcqs);
      // Stop adding chapters once we have a sufficiently large pool (e.g., 3x target size)
      if (questionPool.length >= testSize * 3) {
        break;
      }
    }

    const attemptedIds = new Set(Object.keys(attempted));
    if (questionPool.length < testSize) {
      const unattemptedMcqs = allMcqs
        .filter((m: MCQ) => !attemptedIds.has(m.id))
        .map((m: MCQ) => m.id);
      questionPool.push(...unattemptedMcqs);
    }

    const finalTestIds = [...new Set(questionPool)] // Ensure unique IDs
      .sort(() => 0.5 - Math.random()) // Shuffle
      .slice(0, testSize); // Pick N questions

    log.info(
      `Generated weakness test for user ${request.auth.uid} with ` +
      `${finalTestIds.length} questions.`
    );
    return {mcqIds: finalTestIds};
  }
);

// Admin Function: Suggest Content Metrics
export const suggestContentMetrics = onCall(CORS_OPTIONS, async (request: CallableRequest) => {
  if (!request.auth?.token.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  const { sourceText } = request.data; // sourceText is received
  if (typeof sourceText !== 'string' || sourceText.length === 0) {
      throw new HttpsError("invalid-argument", "Source text is required.");
  }
  // This is a placeholder for actual AI logic to suggest metrics
  // For now, it returns fixed values based on text length as a simple heuristic
  const estimatedMcqCount = Math.min(20, Math.floor(sourceText.length / 500)); // 1 MCQ per 500 chars, max 20
  const estimatedFlashcardCount = Math.min(15, Math.floor(sourceText.length / 700)); // 1 FC per 700 chars, max 15
  return { suggestedMcqCount: Math.max(1, estimatedMcqCount), suggestedFlashcardCount: Math.max(1, estimatedFlashcardCount) };
});

// Admin Function: Generate and Classify Content
export const generateAndClassifyContent = onCall(CORS_OPTIONS, async (request: CallableRequest) => {
  if (!request.auth?.token.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required."); 
  }
  const { sourceText, existingTopics, mcqCount, flashcardCount } = request.data;
  if (typeof sourceText !== 'string' || !Array.isArray(existingTopics) || typeof mcqCount !== 'number' || typeof flashcardCount !== 'number') {
      throw new HttpsError("invalid-argument", "Invalid payload for content generation.");
  }
  
  // Placeholder AI logic for content generation and classification
  // In a real scenario, this would involve complex Vertex AI calls
  // to analyze sourceText, classify it, and generate MCQs/Flashcards.
  log.info(`Generating ${mcqCount} MCQs and ${flashcardCount} Flashcards from source text.`, { uid: request.auth.uid, textLength: sourceText.length });

  const generatedMcqs: Omit<MCQ, 'id' | 'topic' | 'chapter'>[] = Array.from({ length: mcqCount }).map((_, i) => ({
      question: `Generated MCQ Question ${i + 1} from text...`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: 'A',
      explanation: `Explanation for Generated MCQ ${i + 1}.`,
  }));

  const generatedFlashcards: Omit<Flashcard, 'id' | 'topic' | 'chapter'>[] = Array.from({ length: flashcardCount }).map((_, i) => ({
      front: `Generated Flashcard Front ${i + 1} from text...`,
      back: `Generated Flashcard Back ${i + 1}.`,
  }));

  // Simple classification placeholder: suggest a generic topic/chapter
  const suggestedTopic = existingTopics.length > 0 ? existingTopics[0].name : "Uncategorized";
  const suggestedChapter = "AI Generated Content"; // Always suggest a new chapter for generated content

  return {
    suggestedTopic: suggestedTopic,
    suggestedChapter: suggestedChapter,
    isNewChapterSuggestion: true, // Placeholder, assume new for simplicity
    mcqs: generatedMcqs,
    flashcards: generatedFlashcards,
  };
});

// Admin Function: Approve and Save Content
export const approveAndSaveContent = onCall(CORS_OPTIONS, async (request: CallableRequest) => {
  if (!request.auth?.token.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required to approve and save content.");
  }
  const { uploadId, approvedMcqs, approvedFlashcards, topic, chapter } = request.data;
  if (!uploadId || !Array.isArray(approvedMcqs) || !Array.isArray(approvedFlashcards) || !topic || !chapter) {
      throw new HttpsError("invalid-argument", "Invalid payload for content approval.");
  }

  const batch = admin.firestore().batch();
  const topicsRef = admin.firestore().collection("Topics");
  const masterMcqRef = admin.firestore().collection("MasterMCQ");
  const flashcardsRef = admin.firestore().collection("Flashcards");
  const userUploadsRef = admin.firestore().collection("userUploads");

  try {
      // Get the current topic document to check for chapter existence
      const topicDocRef = topicsRef.doc(topic);
      const topicDoc = await topicDocRef.get();
      let chapters: string[] = [];

      if (topicDoc.exists) {
          chapters = topicDoc.data()?.chapters || [];
          if (!chapters.includes(chapter)) {
              chapters.push(chapter); // Add new chapter to existing topic
              batch.update(topicDocRef, { chapters: chapters.sort() });
              log.info(`Added new chapter '${chapter}' to existing topic '${topic}'.`);
          } else {
              log.info(`Chapter '${chapter}' already exists in topic '${topic}'.`);
          }
      } else {
          // Create new topic and add the chapter
          chapters.push(chapter);
          batch.set(topicDocRef, { chapters: chapters.sort() });
          log.info(`Created new topic '${topic}' with chapter '${chapter}'.`);
      }

      // Add approved MCQs
      for (const mcq of approvedMcqs) {
          const newMcqRef = masterMcqRef.doc(); // Firestore generates unique ID
          batch.set(newMcqRef, { ...mcq, topic, chapter });
      }
      log.info(`Added ${approvedMcqs.length} new MCQs to MasterMCQ.`);

      // Add approved Flashcards
      for (const flashcard of approvedFlashcards) {
          const newFlashcardRef = flashcardsRef.doc(); // Firestore generates unique ID
          batch.set(newFlashcardRef, { ...flashcard, topic, chapter });
      }
      log.info(`Added ${approvedFlashcards.length} new Flashcards to Flashcards collection.`);

      // Mark user upload as complete
      batch.update(userUploadsRef.doc(uploadId), { status: 'complete', completedAt: admin.firestore.FieldValue.serverTimestamp() });
      log.info(`Marked userUpload ${uploadId} as complete.`);

      await batch.commit();
      log.info(`Content approved and saved successfully by admin ${request.auth.uid}.`);
      return { success: true, message: "Content approved and saved successfully!" };
  } catch (error: unknown) {
      const err = error as Error;
      log.error(`Error approving and saving content for upload ${uploadId}:`, err);
      throw new HttpsError("internal", err.message || "Failed to approve and save content.");
  }
});