// /workspaces/PediaQuiz/src/pages/AdminReviewPage.tsx

import { useState, useEffect } from "react"; // Added React hooks
import { collection, query, onSnapshot, orderBy, doc, updateDoc, deleteField } from "firebase/firestore";
import { db } from "../firebase";
import { useData } from "../contexts/DataContext";
import { useToast } from "../components/Toast"; // Import useToast
import * as aiService from "../services/aiService";
import type { UserUpload, AwaitingReviewData, Topic, MCQ, Flashcard } from "@/types.ts";
import Loader from "../components/Loader";

const GenerationPipeline = ({ upload, topics }: { upload: UserUpload, topics: Topic[] }) => {
    // FIX: Get addToast from useToast() and addDebugLog from useData()
    const { addDebugLog } = useData();
    const { addToast } = useToast();
    
    const [status, setStatus] = useState<UserUpload['status']>(upload.status);
    const [mcqCount, setMcqCount] = useState(5);
    const [flashcardCount, setFlashcardCount] = useState(5);
    const [reviewData, setReviewData] = useState<AwaitingReviewData | null>(null);

    const [finalTopic, setFinalTopic] = useState('');
    const [finalChapter, setFinalChapter] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { setStatus(upload.status); }, [upload.status]);

    const updateStatusInFirestore = async (newStatus: UserUpload['status'], errorMsg?: string) => {
        try {
            const docRef = doc(db, 'userUploads', upload.id);
            const updatePayload: any = { status: newStatus };
            if (errorMsg) { updatePayload.error = errorMsg; }
            else { updatePayload.error = deleteField(); }
            await updateDoc(docRef, updatePayload);
        } catch (e: any) { addToast(`Error updating status: ${e.message}`, "error"); }
    };

    const handleSuggestMetrics = async () => {
        addDebugLog('AdminReview: Suggesting Metrics...', 'pending', { uploadId: upload.id });
        await updateStatusInFirestore('generating-metrics');
        try {
            const result = await aiService.suggestMetrics(upload.extractedText);
            setMcqCount(result.suggestedMcqCount || 5);
            setFlashcardCount(result.suggestedFlashcardCount || 5);
            await updateStatusInFirestore('pending-generation');
            addDebugLog('AdminReview: Metrics Suggested', 'success', result);
        } catch (e: any) {
            addToast(e.message, 'error');
            await updateStatusInFirestore('error', e.message);
            addDebugLog('AdminReview: Metrics Suggestion Failed', 'error', e);
        }
    };

    const handleGenerateContent = async () => {
        addDebugLog('AdminReview: Generating Content...', 'pending', { uploadId: upload.id, mcqCount, flashcardCount });
        await updateStatusInFirestore('generating-content');
        try {
            const result = await aiService.generateContent({
                sourceText: upload.extractedText,
                existingTopics: topics,
                mcqCount: mcqCount,
                flashcardCount: flashcardCount,
            });
            setReviewData(result);
            setFinalTopic(result.suggestedTopic);
            setFinalChapter(result.suggestedChapter);
            await updateStatusInFirestore('pending-review');
            addDebugLog('AdminReview: Content Generated', 'success', { uploadId: upload.id, classification: { topic: result.suggestedTopic, chapter: result.suggestedChapter } });
        } catch (e: any) {
            addToast(e.message, 'error');
            await updateStatusInFirestore('error', e.message);
            addDebugLog('AdminReview: Content Generation Failed', 'error', e);
        }
    };

    const handleApproveAndSave = async () => {
        if (!reviewData || !finalTopic || !finalChapter) {
            addToast("Topic and Chapter are required.", "error"); return;
        }
        setIsSaving(true);
        addDebugLog('AdminReview: Approving and Saving...', 'pending', { uploadId: upload.id, finalTopic, finalChapter });
        try {
            await aiService.approveContent({
                uploadId: upload.id,
                approvedMcqs: reviewData.mcqs,
                approvedFlashcards: reviewData.flashcards,
                topic: finalTopic,
                chapter: finalChapter
            });
            addToast("Content saved successfully!", "success");
            addDebugLog('AdminReview: Content Saved', 'success', { uploadId: upload.id });
        } catch (e: any) { 
            addToast(e.message, "error");
            addDebugLog('AdminReview: Saving Failed', 'error', e);
            await updateStatusInFirestore('error', e.message);
        }
        finally { setIsSaving(false); }
    }

    const renderCurrentStep = () => {
        switch (status) {
            case 'processed':
                return (<button onClick={handleSuggestMetrics} className="w-full mt-3 bg-sky-500 hover:bg-sky-600 text-white font-bold py-2 px-4 rounded-md">✨ Start Generation</button>);
            case 'error':
                return (<div className="mt-2 p-3 rounded-md bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300">Error: {upload.error} <button onClick={() => updateStatusInFirestore('processed')} className="ml-2 font-bold underline">Retry</button></div>);
            case 'generating-metrics': case 'generating-content':
                return (<div className="mt-3 text-center p-4 bg-slate-100 dark:bg-slate-700 rounded-md flex justify-center items-center gap-3"><Loader message={status === 'generating-metrics' ? 'AI is estimating content...' : 'AI is generating content...'} /></div>);
            case 'pending-generation':
                return (<div className="mt-3 p-4 bg-amber-50 dark:bg-amber-900/30 rounded-lg space-y-4"><h3 className="font-bold">Step 2: Confirm Content Amount</h3><div><label className="block text-sm font-medium">MCQs</label><input type="number" value={mcqCount} onChange={e => setMcqCount(parseInt(e.target.value))} className="w-full p-2 border rounded-md dark:bg-slate-700" /></div><div><label className="block text-sm font-medium">Flashcards</label><input type="number" value={flashcardCount} onChange={e => setFlashcardCount(parseInt(e.target.value))} className="w-full p-2 border rounded-md dark:bg-slate-700" /></div><button onClick={handleGenerateContent} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-md">Confirm & Generate</button></div>);
            case 'pending-review':
                if (!reviewData) return (<div className="mt-3 text-center p-4 bg-slate-100 dark:bg-slate-700 rounded-md flex justify-center items-center gap-3"><Loader message="Loading review data..." /></div>);
                const currentTopic = topics.find(t => t.name === finalTopic);
                const isNewChapter = !currentTopic?.chapters.some(c => c.name === finalChapter);
                return (<div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg space-y-4"><h3 className="font-bold text-xl">Step 3: Review & Approve</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium">Topic</label><select value={finalTopic} onChange={e => setFinalTopic(e.target.value)} className="w-full p-2 border rounded-md dark:bg-slate-700"><option value="">Select Topic</option>{topics.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</select></div><div><label className="block text-sm font-medium">Chapter {isNewChapter && <span className="text-green-500 font-bold">(NEW)</span>}</label><input type="text" value={finalChapter} onChange={e => setFinalChapter(e.target.value)} className="w-full p-2 border rounded-md dark:bg-slate-700" placeholder="Enter new or existing chapter"/></div></div><div className="space-y-4 max-h-96 overflow-y-auto p-2 bg-white dark:bg-slate-800 rounded"><div><h4 className="font-semibold">{reviewData.mcqs.length} MCQs</h4>{reviewData.mcqs.map((mcq: Omit<MCQ, 'id' | 'topic' | 'chapter'>, i: number) => <div key={i} className="text-xs p-2 border-b dark:border-slate-700">{i+1}. {mcq.question}</div>)}</div><div><h4 className="font-semibold mt-4">{reviewData.flashcards.length} Flashcards</h4>{reviewData.flashcards.map((fc: Omit<Flashcard, 'id' | 'topic' | 'chapter'>, i: number) => <div key={i} className="text-xs p-2 border-b dark:border-slate-700"><strong>F:</strong> {fc.front} | <strong>B:</strong> {fc.back}</div>)}</div></div><button onClick={handleApproveAndSave} disabled={isSaving} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-md disabled:opacity-50">{isSaving ? "Saving..." : "Approve & Save Permanently"}</button></div>);
            default: return null;
        }
    }
    return (<div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-md">
        <p className="font-mono text-xs text-slate-400 break-all">{upload.fileName}</p>
        <div className={`mt-2 p-2 rounded-md ${upload.status === "error" ? "bg-red-100 dark:bg-red-800" : "bg-slate-100 dark:bg-slate-900/50"}`}>
            <p className="font-semibold text-sm">Status: <span className="font-bold capitalize">{status.replace(/-/g, ' ')}</span></p>
            {status === 'processed' && 
                <p className="text-xs mt-1 text-slate-500 dark:text-slate-400 truncate">
                    Preview: {(upload.extractedText || '').substring(0, 100)}...
                </p>
            }
        </div>
        {renderCurrentStep()}
    </div>);
};

const AdminReviewPage = () => {
  const { data } = useData();
  const [uploads, setUploads] = useState<UserUpload[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const q = query(collection(db, "userUploads"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedUploads: UserUpload[] = [];
      querySnapshot.forEach((doc) => { fetchedUploads.push({ id: doc.id, ...doc.data() } as UserUpload); });
      setUploads(fetchedUploads.filter(u => u.status !== 'complete')); 
      setIsLoading(false);
    }, (error) => {
        console.error("Error fetching admin queue:", error);
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);
  if (isLoading || !data?.topics) {
    return <div className="flex justify-center items-center gap-3 p-10"><Loader message="Loading Admin Pipeline..." /></div>;
  }
  return (<div className="space-y-6"><h1 className="text-3xl font-bold">AI Content Review Queue</h1><p className="text-slate-500">Uploads appear here for processing and review. Completed jobs are removed from this list.</p><div className="space-y-4">{uploads.length === 0 ? (<p className="text-center py-8 text-slate-500">No pending jobs in the queue.</p>) : (uploads.map((uploadItem: UserUpload) => (<GenerationPipeline key={uploadItem.id} upload={uploadItem} topics={data.topics} />)))}</div></div>); 
};
export default AdminReviewPage;