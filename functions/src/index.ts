// PediaQuiz/functions/src/index.ts
// DEFINITIVE, RESTORED, AND STABLE VERSION (WITH ALL DIAGNOSED FIXES)

import { HttpsError, onCall, CallableRequest } from "firebase-functions/v2/https";
import { onObjectFinalized, StorageEvent } from "firebase-functions/v2/storage";
import { onDocumentCreated, FirestoreEvent, DocumentSnapshot } from "firebase-functions/v2/firestore";
// Removed: import { defineString } from 'firebase-functions/v2/params'; // CAUSES ERR_PACKAGE_PATH_NOT_EXPORTED due to version
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";
import { VertexAI } from "@google-cloud/vertexai";
import { v1 } from "@google-cloud/vision";
import { getStorage } from "firebase-admin/storage"; // Correct Admin SDK Storage import
import type { MCQ, Flashcard } from "@pediaquiz/types";

admin.initializeApp();
const log = logger;

// --- DEFINITIVE CONFIGURATION ---
const MODEL_NAME = "gemini-2.5-flash";
const BUCKET_NAME = "pediaquizapp.firebasestorage.app"; // Using the confirmed, hardcoded bucket name
const LOCATION = "us-central1";

// =================================================================================================
// ORIGINAL FUNCTIONS (RESTORED & CORRECTED)
// =================================================================================================

export const helloWorld = onCall({ region: LOCATION, cors: true }, (request: CallableRequest) => {
  log.info("Executing helloWorld with input:", request.data);
  const name = request.data.name || "world";
  return { greeting: `Hello, ${name}. The backend is stable.` };
});

export const setAdminRole = onCall({ region: LOCATION, cors: true }, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const CALLER_UID = "hzy8IULluOfxqnEIR3nQ731MI5w1";
  const isSuperAdmin = request.auth.uid === CALLER_UID;
  const isExistingAdmin = !!request.auth.token.isAdmin;

  if (!isSuperAdmin && !isExistingAdmin) {
    throw new HttpsError("permission-denied", "Not authorized.");
  }

  const { uidToMakeAdmin } = request.data;
  if (typeof uidToMakeAdmin !== "string" || !uidToMakeAdmin.length) {
    throw new HttpsError("invalid-argument", "UID is required.");
  }

  try {
    await admin.auth().setCustomUserClaims(uidToMakeAdmin, { isAdmin: true });
    await admin.firestore().collection("users").doc(uidToMakeAdmin)
      .set({ isAdmin: true }, { merge: true });
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

export const deleteContentItem = onCall({ region: LOCATION, cors: true }, async (request: CallableRequest) => {
  if (!request.auth?.token.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  const { id, type } = request.data;
  if (!id || typeof id !== "string" || !["mcq", "flashcard"].includes(type)) {
    throw new HttpsError("invalid-argument", "Valid ID and type required.");
  }
  const collectionRef = type === "mcq" ?
    admin.firestore().collection("MasterMCQ") :
    admin.firestore().collection("Flashcards");

  try {
    await collectionRef.doc(id).delete();
    log.info(`Admin ${request.auth.uid} deleted ${type} ${id}`);
    return { success: true, message: `Successfully deleted ${type} ${id}` };
  } catch (error: unknown) {
    const err = error as Error;
    log.error(`Error deleting ${type} ${id}:`, err);
    throw new HttpsError("internal", err.message);
  }
});

export const generateMCQExplanation = onCall({ region: LOCATION, cors: true }, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }
  const { question, options, answer } = request.data;
  if (
    typeof question !== 'string' || !question ||
    !Array.isArray(options) || options.length !== 4 ||
    !options.every((opt: unknown) => typeof opt === 'string' && opt.length > 0) ||
    typeof answer !== 'string' || !['A', 'B', 'C', 'D'].includes(answer)
  ) {
    throw new HttpsError("invalid-argument", "Invalid MCQ data provided.");
  }
  try {
    const vertexAi = new VertexAI({ project: process.env.GCLOUD_PROJECT, location: LOCATION });
    const generativeModel = vertexAi.getGenerativeModel({ model: MODEL_NAME });
    const optionsText = options
      .map((opt: string, index: number) => `${String.fromCharCode(65 + index)}. ${opt}`)
      .join("\n");
    const prompt = `You are an expert pediatrician with concise and precise medical knowledge.
Provide a detailed explanation for the given MCQ using the following structure:
- Correct Answer Explanation: Clearly state the rationale behind the correct option.
- Incorrect Options Explanation: Concisely explain why each incorrect option is wrong.
Use factual, clinical language without any conversational or superfluous text.

Question: ${question}
Options:
${optionsText}
Correct Answer: ${answer}`;

    const resp = await generativeModel.generateContent(prompt);
    const explanation = resp.response.candidates?.[0]?.content?.parts?.[0]?.text || "No explanation generated.";
    return { explanation };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error.";
    log.error("Error calling Vertex AI for explanation:", err);
    throw new HttpsError("internal", "AI Error: " + errorMessage);
  }
});

export const generatePerformanceAdvice = onCall({ region: LOCATION, cors: true }, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be logged in.");
  }
  const { strongTopics, weakTopics, overallAccuracy } = request.data;
  if (
    !Array.isArray(strongTopics) ||
    !Array.isArray(weakTopics) ||
    typeof overallAccuracy !== "number"
  ) {
    throw new HttpsError("invalid-argument", "Invalid performance data.");
  }
  try {
    const vertexAi = new VertexAI({ project: process.env.GCLOUD_PROJECT, location: LOCATION });
    const generativeModel = vertexAi.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `You are a supportive and motivational medical education coach.
Based on the user's performance data below, provide concise, actionable study advice formatted in markdown with two distinct sections:
- Areas to Consolidate: Highlight topics where the user demonstrates strength and should reinforce knowledge.
- Areas for Revision: Identify weaker topics that require focused attention.

User Performance:
- Accuracy: ${overallAccuracy.toFixed(1)}%
- Strong Topics: ${strongTopics.join(", ") || "None yet"}
- Weak Topics: ${weakTopics.join(", ") || "None yet"}

Limit your response to 150 words or less.`;
    const resp = await generativeModel.generateContent(prompt);
    const advice = resp.response.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate advice.";
    return { advice };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error.";
    log.error("Error getting advice:", err);
    throw new HttpsError("internal", "AI Error: " + errorMessage);
  }
});

export const generateWeaknessBasedTest = onCall({ region: LOCATION, cors: true }, async (request: CallableRequest) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const { attempted, allMcqs, testSize = 20 } = request.data;
    if (!attempted || !Array.isArray(allMcqs) || allMcqs.length === 0) {
        throw new HttpsError("invalid-argument", "Performance data and MCQs are required.");
    }

    const chapterStats: Record<string, { correct: number, total: number, accuracy: number }> = {};

    for (const mcqId in attempted) {
        if (Object.prototype.hasOwnProperty.call(attempted, mcqId)) {
            const mcq = allMcqs.find((m: MCQ) => m.id === mcqId);
            if (mcq && mcq.chapter) {
                const chapter = mcq.chapter;
                if (!chapterStats[chapter]) {
                    chapterStats[chapter] = { correct: 0, total: 0, accuracy: 0 };
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
    for (const chapter of sortedChapters) {
        const chapterMcqs = allMcqs
            .filter((m: MCQ) => m.chapter === chapter)
            .map((m: MCQ) => m.id);
        questionPool.push(...chapterMcqs);
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

    const finalTestIds = [...new Set(questionPool)]
        .sort(() => 0.5 - Math.random())
        .slice(0, testSize);

    log.info(`Generated weakness test for user ${request.auth.uid} with ${finalTestIds.length} questions.`);
    return { mcqIds: finalTestIds };
});


// =================================================================================================
// NEW PIPELINE FUNCTIONS
// =================================================================================================

export const onFileUploaded = onObjectFinalized({ region: LOCATION, bucket: BUCKET_NAME }, async (event: StorageEvent) => {
  const filePath = event.data.name;
  const contentType = event.data.contentType || "";

  if (!filePath.startsWith("uploads/") || filePath.endsWith("/")) {
    log.info(`File ${filePath} is not a valid upload. Skipping.`);
    return;
  }

  const uidMatch = filePath.match(/^uploads\/([^/]+)\//);
  if (!uidMatch || !uidMatch[1]) {
    log.warn(`Could not extract UID from path: ${filePath}.`);
    return;
  }
  const uid = uidMatch[1];
  const originalFileName = filePath.split("/").pop() || "Unknown Filename";

  try {
    const jobRef = await admin.firestore().collection("generationJobs").add({
      uid: uid,
      originalFileName: originalFileName,
      originalFilePath: filePath,
      contentType: contentType,
      status: "pending_ocr",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    log.info(`Successfully created Generation Job ${jobRef.id} for user ${uid}.`);
  } catch (error) {
    log.error(`Failed to create generation job for file ${filePath}.`, error);
  }
});

export const processPendingOcrDocument = onDocumentCreated({ document: "generationJobs/{jobId}", region: LOCATION, timeoutSeconds: 540 }, async (event: FirestoreEvent<DocumentSnapshot | undefined>) => {
    if (!event.data) {
        log.error(`Event for Job ${event.params.jobId} had no data. Skipping.`);
        return;
    }
    const jobDocRef = event.data.ref;
    const jobData = event.data.data() as any;

    if (jobData.status !== "pending_ocr") {
        log.info(`Job ${event.params.jobId} is not pending OCR. Skipping.`);
        return;
    }

    const { originalFilePath, contentType } = jobData;
    log.info(`Starting OCR for Job ${event.params.jobId} on file ${originalFilePath}.`);

    try {
        const visionClient = new v1.ImageAnnotatorClient();
        const gcsSourceUri = `gs://${BUCKET_NAME}/${originalFilePath}`;
        let extractedText = "";

        if (contentType === "application/pdf") {
            const outputPrefix = `ocr-results/${jobData.uid}/${event.params.jobId}`;
            const gcsDestinationUri = `gs://${BUCKET_NAME}/${outputPrefix}/`;

            const [operation] = await visionClient.asyncBatchAnnotateFiles({
                requests: [{
                    inputConfig: { gcsSource: { uri: gcsSourceUri }, mimeType: "application/pdf" },
                    features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
                    outputConfig: { gcsDestination: { uri: gcsDestinationUri }, batchSize: 20 },
                }],
            });
            await operation.promise();

            const storage = getStorage(admin.app()); // Call getStorage without direct type assertion here
            const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix: outputPrefix });
            const textOutputs = await Promise.all(files.map(async (file: any) => { // Use 'any' for file parameter
                if (!file.name.endsWith(".json")) return "";
                const [jsonData] = await file.download();
                const annotation = JSON.parse(jsonData.toString());
                return annotation.responses?.map((page: any) => page.fullTextAnnotation?.text || "").join("\n") || "";
            }));
            extractedText = textOutputs.join("\n\n");
            await Promise.all(files.map(async (file: any) => file.delete())); // Use 'any' for file parameter

        } else {
            throw new Error(`Unsupported content type for OCR: ${contentType}`);
        }

        if (extractedText.length < 100) {
            throw new Error(`Extracted text is too short (${extractedText.length} chars). May indicate a blank or image-only document.`);
        }

        await jobDocRef.update({
            status: "processed",
            extractedText: extractedText,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        log.info(`Successfully finished OCR for Job ${event.params.jobId}.`);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown OCR error.";
        log.error(`OCR failed for Job ${event.params.jobId}:`, error);
        await jobDocRef.update({
            status: "error",
            error: `OCR Failed: ${errorMessage}`,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
});

export const suggestClassification = onCall({ region: LOCATION, cors: true }, async (request: CallableRequest) => {
  if (!request.auth?.token.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  const { jobId } = request.data;
  if (!jobId || typeof jobId !== "string") {
    throw new HttpsError("invalid-argument", "A valid 'jobId' is required.");
  }

  const jobDoc = await admin.firestore().collection("generationJobs").doc(jobId).get();
  if (!jobDoc.exists) {
    throw new HttpsError("not-found", "Generation job with that ID was not found.");
  }
  const jobData = jobDoc.data() as any;
  if (jobData.status !== "processed") {
    throw new HttpsError("failed-precondition", "Job is not in a 'processed' state.");
  }
  const { extractedText } = jobData;

  try {
    const vertexAi = new VertexAI({ project: process.env.GCLOUD_PROJECT, location: LOCATION });
    const generativeModel = vertexAi.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: "application/json" },
    });
    const prompt = `You are an expert in Indian postgraduate pediatrics medical curricula.
Examine the following excerpt and provide a classification with:
1. The most appropriate Topic and Chapter name for the content.
2. An estimate of the number of clinically relevant, high-quality MCQs and Flashcards that can be generated from this material.
3. A precise source reference (e.g., "Nelson's 22nd Ed., Chapter X").

Text excerpt (up to 20,000 characters): """${extractedText?.substring(0, 20000) || ""}"""

Return a single JSON object exactly as follows:
{"suggestedTopic": "string", "suggestedChapter": "string", "estimatedMcqCount": number, "estimatedFlashcardCount": number, "sourceReference": "string"}`;

    const resp = await generativeModel.generateContent(prompt);
    const suggestions = JSON.parse(resp.response.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
    return { suggestions };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown AI error.";
    log.error(`AI classification failed for Job ${jobId}:`, error);
    throw new HttpsError("internal", `AI Classification Failed: ${errorMessage}`);
  }
});

export const generateContentBatch = onCall({ region: LOCATION, cors: true, timeoutSeconds: 540 }, async (request: CallableRequest) => {
  if (!request.auth?.token.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  const { jobId, userSelections } = request.data;
  if (!jobId || !userSelections) {
    throw new HttpsError("invalid-argument", "jobId and userSelections are required.");
  }
  const { topic, chapter, mcqCount, flashcardCount, sourceReference } = userSelections;
  void topic; // Explicitly mark as used for TS
  void chapter; // Explicitly mark as used for TS
  log.info(`Generating ${mcqCount} MCQs and ${flashcardCount} flashcards for topic: ${topic}, chapter: ${chapter}.`);

  const jobDocRef = admin.firestore().collection("generationJobs").doc(jobId);
  const jobDoc = await jobDocRef.get();
  if (!jobDoc.exists) {
    throw new HttpsError("not-found", "Job with that ID was not found.");
  }
  const jobData = jobDoc.data() as any;
  if (jobData.status !== "processed") {
    throw new HttpsError("failed-precondition", "Job is not in a 'processed' state.");
  }
  const { extractedText } = jobData;

  try {
    const vertexAi = new VertexAI({ project: process.env.GCLOUD_PROJECT, location: LOCATION });
    const generativeModel = vertexAi.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: "application/json" },
    });
    const prompt = `You are a specialist medical educator with deep expertise in Indian postgraduate pediatrics exams (NEET-SS/INI-SS).
Using the following source text, generate:
- Exactly ${mcqCount} clinically relevant, vignette-style MCQs.
- Exactly ${flashcardCount} concise, high-yield flashcards.
All MCQs must include clear questions, four options, a correct answer letter, and comprehensive, fact-based explanations. Flashcards should be precise and emphasize core concepts.

Source Text: """${extractedText || ""}"""

Return a single JSON object with this exact structure ONLY:
{"mcqs": [{"question": "...", "options": ["...", "...", "...", "..."], "answer": "A", "explanation": "..."}, ...], "flashcards": [{"front": "...", "back": "..."}, ...]}`;

    const resp = await generativeModel.generateContent(prompt);
    const stagedContent = JSON.parse(resp.response.candidates?.[0]?.content?.parts?.[0]?.text || "{}");

    if (stagedContent.mcqs && sourceReference) {
      stagedContent.mcqs.forEach((mcq: MCQ) => {
        mcq.explanation = `${mcq.explanation} (Source: ${sourceReference})`;
      });
    }

    await jobDocRef.update({
      userSelections: userSelections,
      stagedContent: stagedContent,
      status: 'review_pending',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { success: true, message: "Content batch generated and is pending review." };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown AI error.";
    log.error(`AI content generation failed for Job ${jobId}:`, error);
    await jobDocRef.update({ status: "error", error: `AI Generation Failed: ${errorMessage}` });
    throw new HttpsError("internal", `AI Generation Failed: ${errorMessage}`);
  }
});

export const approveAndSaveContent = onCall({ region: LOCATION, cors: true }, async (request: CallableRequest) => {
  if (!request.auth?.token.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  const { jobId } = request.data;
  if (!jobId || typeof jobId !== "string") {
    throw new HttpsError("invalid-argument", "A valid 'jobId' is required.");
  }

  const db = admin.firestore();
  const jobDocRef = db.collection("generationJobs").doc(jobId);
  let savedMcqCount = 0;

  try {
    await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
      const jobDoc = await transaction.get(jobDocRef);
      if (!jobDoc.exists) {
        throw new HttpsError("not-found", "Job not found.");
      }
      const jobData = jobDoc.data() as any;
      if (jobData.status !== "review_pending") {
        throw new HttpsError("failed-precondition", "Job is not pending review.");
      }

      const { stagedContent, userSelections } = jobData;
      if (!userSelections || !stagedContent) {
        throw new HttpsError("failed-precondition", "Job is missing selections or staged content.");
      }
      const { topic, chapter } = userSelections;
      const mcqsToSave: (Omit<MCQ, 'id'>)[] = stagedContent.mcqs || [];
      const flashcardsToSave: Flashcard[] = stagedContent.flashcards || [];
      const savedMcqIds: string[] = [];

      savedMcqCount = mcqsToSave.length;

      for (const mcq of mcqsToSave) {
        const newMcqRef = db.collection("MasterMCQ").doc();
        transaction.set(newMcqRef, { ...mcq, topic, chapter, sourceJobId: jobId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        savedMcqIds.push(newMcqRef.id);
      }

      for (const flashcard of flashcardsToSave) {
        const newFlashcardRef = db.collection("Flashcards").doc();
        transaction.set(newFlashcardRef, { ...flashcard, topic, chapter, sourceJobId: jobId, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      }

      transaction.update(jobDocRef, {
        status: "complete",
        stagedContent: admin.firestore.FieldValue.delete(),
        approvedMcqIds: admin.firestore.FieldValue.arrayUnion(...savedMcqIds),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    return { success: true, message: `Successfully approved and saved ${savedMcqCount} MCQs.` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown transaction error.";
    log.error(`Approval failed for Job ${jobId}:`, error);
    await jobDocRef.update({ status: "error", error: `Approval Failed: ${errorMessage}` });
    throw new HttpsError("internal", `Approval Failed: ${errorMessage}`);
  }
});
