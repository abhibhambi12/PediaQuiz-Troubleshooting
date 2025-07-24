// /home/abhibhambi12/PediaQuiz/functions/src/index.ts

import {onCall, HttpsError, CallableRequest} from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {VertexAI} from "@google-cloud/vertexai";

// --- START OF TYPE DEFINITIONS ---
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
  front: string;
  back: string;
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
}
// --- END OF TYPE DEFINITIONS ---

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

export const setAdminRole = onCall(CORS_OPTIONS, async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const CALLER_UID = "hzy8IULluOfxqnEIR3nQ731MI5w1";
  const isSuperAdmin = request.auth.uid === CALLER_UID;
  const isExistingAdmin = !!request.auth.token.isAdmin;

  if (!isSuperAdmin && !isExistingAdmin) {
    throw new HttpsError("permission-denied", "Not authorized.");
  }

  const {uidToMakeAdmin} = request.data;
  if (typeof uidToMakeAdmin !== "string" || !uidToMakeAdmin.length) {
    throw new HttpsError("invalid-argument", "UID is required.");
  }

  try {
    await admin.auth().setCustomUserClaims(uidToMakeAdmin, {isAdmin: true});
    await admin.firestore().collection("users").doc(uidToMakeAdmin)
      .set({isAdmin: true}, {merge: true});
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

export const deleteContentItem = onCall(CORS_OPTIONS, async (request: CallableRequest) => {
  if (!request.auth?.token.isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
  const {id, type} = request.data;
  if (!id || typeof id !== "string" || !["mcq", "flashcard"].includes(type)) {
    throw new HttpsError("invalid-argument", "Valid ID and type required.");
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

export const generateMCQExplanation = onCall(
  CORS_OPTIONS,
  async (request: CallableRequest) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    const {question, options, answer} = request.data;
    const optionsAreValid = options.every(
      (opt: unknown) => typeof opt === "string" && opt.length > 0
    );
    const isValidMCQ =
    typeof question === "string" && !!question &&
    Array.isArray(options) && options.length === 4 &&
    optionsAreValid &&
    typeof answer === "string" && ["A", "B", "C", "D"].includes(answer);
    if (!isValidMCQ) {
      throw new HttpsError("invalid-argument", "Invalid MCQ data provided.");
    }
    try {
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

      const resp = await generativeModel.generateContent(
        {contents: [{role: "user", parts: [{text: prompt}]}]}
      );
      const explanation = resp.response.candidates?.[0]?.
        content?.parts?.[0]?.text || "No explanation generated.";

      return {explanation};
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error.";
      log.error("Error calling Vertex AI:", err);
      throw new HttpsError("internal", "AI Error: " + errorMessage);
    }
  }
);

export const generatePerformanceAdvice = onCall(
  CORS_OPTIONS,
  async (request: CallableRequest) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be logged in.");
    }
    const {strongTopics, weakTopics, overallAccuracy} = request.data;
    if (
      !Array.isArray(strongTopics) ||
    !Array.isArray(weakTopics) ||
    typeof overallAccuracy !== "number"
    ) {
      throw new HttpsError("invalid-argument", "Invalid performance data.");
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
      throw new HttpsError("unauthenticated", "Authentication required.");
    }
    const {attempted, allMcqs, testSize = 20} = request.data;
    if (!attempted || !Array.isArray(allMcqs) || allMcqs.length === 0) {
      throw new HttpsError(
        "invalid-argument", "Performance data and MCQs are required."
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
    for (const chapter of sortedChapters) {
      const chapterMcqs = allMcqs
        .filter((m: MCQ) => m.chapter === chapter).map((m: MCQ) => m.id);
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

    log.info(
      `Generated weakness test for user ${request.auth.uid} with ` +
      `${finalTestIds.length} questions.`
    );
    return {mcqIds: finalTestIds};
  }
);