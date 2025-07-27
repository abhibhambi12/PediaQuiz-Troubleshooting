import { collection, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { db } from "../firebase";
import type { AppData, Topic, Chapter, MCQ, Flashcard, DebugData, RawTopicChapter } from "@pediaquiz/types";

const MCQ_COLLECTION_NAME = "MasterMCQ";
const TOPICS_COLLECTION_NAME = "Topics";
const FLASHCARDS_COLLECTION_NAME = "Flashcards";

export async function signIn(email: string, password: string) {
  const auth = getAuth();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    await user.getIdToken(true);
    console.log("ID token refreshed for user:", user.uid);
    return user;
  } catch (error: any) {
    console.error("Login error:", error);
    throw new Error(`Login failed: ${error.message}`);
  }
}

async function fetchAllMCQs(): Promise<MCQ[]> {
  const mcqsCollection = collection(db, MCQ_COLLECTION_NAME);
  const mcqSnapshot = await getDocs(mcqsCollection);
  console.log(`[FirestoreService] MasterMCQ snapshot size: ${mcqSnapshot.size}`);
  const mcqList = mcqSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as MCQ));
  return mcqList;
}

async function fetchAllTopics(): Promise<Array<{ id: string; name: string; chapters: RawTopicChapter[] }>> {
  const topicsCollection = collection(db, TOPICS_COLLECTION_NAME);
  const topicSnapshot = await getDocs(topicsCollection);
  console.log(`[FirestoreService] Topics snapshot size: ${topicSnapshot.size}`);
  const topicList = topicSnapshot.docs.map((doc) => {
    const data = doc.data();
    return { id: doc.id, name: doc.id, chapters: data.chapters as RawTopicChapter[] || [] };
  });
  return topicList;
}

async function fetchAllFlashcards(): Promise<Flashcard[]> {
  const flashcardsCollection = collection(db, FLASHCARDS_COLLECTION_NAME);
  const flashcardSnapshot = await getDocs(flashcardsCollection);
  console.log(`[FirestoreService] Flashcards snapshot size: ${flashcardSnapshot.size}`);
  const flashcardList = flashcardSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Flashcard));
  return flashcardList;
}

function processAndAugmentData(rawTopics: Array<{ id: string; name: string; chapters: RawTopicChapter[] }>, rawMcqs: MCQ[], rawFlashcards: Flashcard[]): AppData {
  const mcqsByChapterName: Record<string, number> = {};
  for (const mcq of rawMcqs) {
    if (mcq.chapter) {
      mcqsByChapterName[mcq.chapter] = (mcqsByChapterName[mcq.chapter] || 0) + 1;
    }
  }

  const augmentedTopics: Topic[] = rawTopics.map((rawTopic) => {
    let totalTopicMcqCount = 0;
    const processedChapters: Chapter[] = (rawTopic.chapters || []).map((chapterName) => {
      const mcqCount = mcqsByChapterName[chapterName] || 0;
      totalTopicMcqCount += mcqCount;
      return { id: chapterName, name: chapterName, mcqCount: mcqCount };
    });
    processedChapters.sort((a, b) => a.name.localeCompare(b.name));
    return {
      id: rawTopic.id,
      name: rawTopic.name,
      chapters: processedChapters,
      chapterCount: processedChapters.length,
      totalMcqCount: totalTopicMcqCount
    };
  });
  augmentedTopics.sort((a, b) => a.name.localeCompare(b.name));
  return { topics: augmentedTopics, mcqs: rawMcqs, flashcards: rawFlashcards };
}

export async function getAppData(): Promise<{ processedData: AppData; debugData: DebugData; }> {
  let debugInfo: DebugData = {};
  try {
    const [rawTopics, rawMcqs, rawFlashcards] = await Promise.all([
      fetchAllTopics(),
      fetchAllMCQs(),
      fetchAllFlashcards()
    ]);

    debugInfo.rawTopicsFromFirestore = rawTopics;
    debugInfo.rawMcqsFromFirestore = rawMcqs;

    if (rawTopics.length === 0 || rawMcqs.length === 0) {
      throw new Error("Firestore collections 'Topics' or 'MasterMCQ' appear empty or unreadable.");
    }
    const processedData = processAndAugmentData(rawTopics, rawMcqs, rawFlashcards);
    debugInfo.processedAppData = processedData;
    return { processedData, debugData: debugInfo };
  } catch (error: any) {
    console.error("Error fetching or processing app data:", error);
    debugInfo.errorMessage = error.message;
    let userMessage = "Failed to load data from the database.";
    if (error.code === "permission-denied") {
      userMessage += " Firestore permission denied.";
    } else if (error.message.includes("empty or unreadable")) {
      userMessage += " Collections might be empty.";
    }
    throw new Error(userMessage);
  }
}