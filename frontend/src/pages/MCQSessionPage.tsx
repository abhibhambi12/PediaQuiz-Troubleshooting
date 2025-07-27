import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useData } from "@/contexts/DataContext";
import { MCQ } from "@/types.ts";
import { BookmarkIcon } from "@/components/Icons";
import { useToast } from "@/components/Toast";
import Loader from "@/components/Loader";
import * as aiService from "@/services/aiService";

const QuestionNavigator = ({ count, currentIndex, answers, mcqs, goToQuestion, mode, isFinished }: { count: number; currentIndex: number; answers: Record<number, string | null>; mcqs: MCQ[]; goToQuestion: (index: number) => void; mode: string; isFinished: boolean; }) => (
    <div className="mt-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg">
        <h3 className="font-bold mb-3 text-slate-800 dark:text-slate-200">Question Navigator</h3>
        <div className="flex flex-wrap gap-2">
            {Array.from({ length: count }, (_, i) => {
                const isCurrent = i === currentIndex;
                const answer = answers[i];
                const mcq = mcqs[i];
                let colorClass = "bg-white dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600";
                if (answer !== undefined && answer !== null && mcq) {
                    if (isFinished || (mode !== 'quiz' && mode !== 'weakness')) {
                        colorClass = answer === mcq.answer ? "bg-green-500 text-white" : "bg-red-500 text-white";
                    } else { colorClass = "bg-sky-500 text-white"; }
                }
                if (isCurrent && !isFinished) colorClass += " ring-2 ring-offset-2 dark:ring-offset-slate-800 ring-blue-500";
                return (<button key={i} onClick={() => goToQuestion(i)} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-sm ${colorClass}`}>{i + 1}</button>);
            })}
        </div>
    </div>
);

const MCQSessionPage = () => {
    const { chapterId, mode: modeParam } = useParams<{ chapterId: string; mode: string; }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { data, user, bookmarks, toggleBookmark, attempted, addAttempt, addQuizResult, addDebugLog, refreshData } = useData(); // Added addDebugLog and refreshData
    const { addToast } = useToast();
    const [mcqs, setMcqs] = useState<MCQ[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showAnswer, setShowAnswer] = useState(false);
    const [answers, setAnswers] = useState<Record<number, string | null>>({});
    const [isFinished, setIsFinished] = useState(false);
    const [explanation, setExplanation] = useState<string | null>(null); // This state will hold the explanation to display
    const [isExplanationLoading, setIsExplanationLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [advice, setAdvice] = useState<string | null>(null);
    const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);

    const { selectedChapterIds, totalQuestions: customTotalQuestions, generatedMcqIds } = (location.state || {}) as { selectedChapterIds?: string[]; totalQuestions?: number; generatedMcqIds?: string[]; };
    const mode = (modeParam ?? "practice") as ("practice" | "quiz" | "wrong" | "weakness");

    // Memoize currentMcq to avoid re-renders and re-calculations
    const currentMcq = useMemo(() => {
        return mcqs[currentIndex];
    }, [mcqs, currentIndex]);

    useEffect(() => {
        if (!data) return;
        let sessionMcqs: MCQ[] = [];
        if (mode === 'weakness' && generatedMcqIds) {
            const mcqMap = new Map(data.mcqs.map((m: MCQ) => [m.id, m]));
            sessionMcqs = generatedMcqIds.map(id => mcqMap.get(id)).filter((mcq): mcq is MCQ => !!mcq);
        } else if (chapterId === "custom" && selectedChapterIds?.length) {
            const selectedSet = new Set(selectedChapterIds);
            const mcqPool = data.mcqs.filter((mcq: MCQ) => selectedSet.has(mcq.chapter));
            sessionMcqs = mcqPool.sort(() => 0.5 - Math.random()).slice(0, customTotalQuestions || mcqPool.length);
        } else if (mode === "wrong") {
            const chapterMcqs = data.mcqs.filter((mcq: MCQ) => mcq.chapter === chapterId);
            const wrongSet = new Set(Object.keys(attempted).filter((id) => !attempted[id].isCorrect));
            sessionMcqs = chapterMcqs.filter((mcq: MCQ) => wrongSet.has(mcq.id));
        } else if (chapterId && data.mcqs) {
            sessionMcqs = data.mcqs.filter((mcq: MCQ) => mcq.chapter === chapterId);
        }
        
        setMcqs(sessionMcqs);
        setCurrentIndex(0);
        setShowAnswer(false);
        setAnswers({});
        setIsFinished(false);
        setExplanation(null); // Clear explanation state when a new session starts
    }, [data, chapterId, mode, selectedChapterIds, customTotalQuestions, generatedMcqIds, attempted]);

    const handleSelectOption = (option: "A" | "B" | "C" | "D") => {
        if (showAnswer || isFinished) return;
        const isCorrect = mcqs[currentIndex].answer === option;
        addAttempt(mcqs[currentIndex].id, isCorrect, option);
        setAnswers((prev) => ({ ...prev, [currentIndex]: option }));
        if (mode !== "quiz" && mode !== "weakness") {
            setShowAnswer(true);
        }
    };

    const goToQuestion = (index: number) => {
        if (index < 0 || index >= mcqs.length) return;
        setCurrentIndex(index);
        setExplanation(null); // Clear local explanation state when moving to a new question
        if (isFinished) {
            setShowAnswer(true);
        } else if (mode !== 'quiz' && mode !== 'weakness') {
            setShowAnswer(answers[index] !== undefined && answers[index] !== null);
        }
    };

    const handleNext = () => {
        if (currentIndex < mcqs.length - 1) {
            goToQuestion(currentIndex + 1);
        } else {
            setIsFinished(true);
            setShowAnswer(true);
            if (mode === 'quiz' || mode === 'weakness') {
                mcqs.forEach((mcq, index) => {
                    const selected = answers[index];
                    if (selected === undefined || selected === null) {
                        addAttempt(mcq.id, false, null);
                    }
                });
                const correctCount = mcqs.filter((mcq, index) => answers[index] === mcq.answer).length;
                addQuizResult({ chapterId: chapterId || "custom", score: correctCount, totalQuestions: mcqs.length, results: [] });
            }
        }
    };
    
    // Updated handleExplain to use caching logic
    const handleExplain = async () => {
        if (!currentMcq) return;
        setIsExplanationLoading(true);
        setExplanation(null); // Clear previous explanation while loading

        // 1. Check if explanation is already present in the current MCQ object (from Firestore data)
        // The `data.mcqs` array, which `mcqs` is derived from, should contain the explanation if it's cached in Firestore
        if (currentMcq.explanation) {
            setExplanation(currentMcq.explanation);
            addDebugLog('MCQ Explain', 'success', 'Explanation loaded from cache (Firestore).');
            setIsExplanationLoading(false);
            return; // Exit early as explanation is found
        }

        // 2. If not found, call AI service to generate and save
        addDebugLog('MCQ Explain', 'pending', 'Generating new explanation with AI...');
        try {
            const result = await aiService.getMCQExplanation({
                mcqId: currentMcq.id, // Pass MCQ ID for caching on the backend
                question: currentMcq.question,
                options: currentMcq.options,
                answer: currentMcq.answer
            });
            setExplanation(result);
            addToast("Explanation generated and saved!", "success"); // Notify user
            addDebugLog('MCQ Explain', 'success', 'New explanation generated and saved to Firestore.');
            // After saving to Firestore, we should ideally refresh the main app data
            // so the `currentMcq.explanation` property gets updated for future sessions.
            await refreshData(); 
        } catch (e: any) {
            setExplanation("Error: Could not generate explanation. " + e.message);
            addToast(`Error explaining: ${e.message}`, "error");
            addDebugLog('MCQ Explain', 'error', `Failed to generate explanation: ${e.message}`);
        }
        finally {
            setIsExplanationLoading(false);
        }
    };

    const handleDeleteMCQ = async (idToDelete: string) => {
        if (!user?.isAdmin) return;
        if (window.confirm("Permanently delete this MCQ?")) {
            setIsDeleting(true);
            addDebugLog('Delete MCQ', 'pending', `Attempting to delete MCQ: ${idToDelete}`);
            try {
                await aiService.deleteContentItem(idToDelete, 'mcq');
                addToast("MCQ Deleted.", "success");
                addDebugLog('Delete MCQ', 'success', `MCQ ${idToDelete} deleted successfully.`);
                navigate(-1); // Go back after deletion
            } catch (e: any) {
                addToast(e.message, "error");
                addDebugLog('Delete MCQ', 'error', `Failed to delete MCQ ${idToDelete}: ${e.message}`);
            }
            finally { setIsDeleting(false); }
        }
    };

    const { finalScore, correctCount, incorrectCount, skippedCount } = useMemo(() => {
        if (!isFinished) return { finalScore: 0, correctCount: 0, incorrectCount: 0, skippedCount: 0 };
        let score = 0, correct = 0, incorrect = 0, skipped = 0;
        mcqs.forEach((mcq, index) => {
            const userChoice = answers[index];
            if (userChoice === undefined || userChoice === null) skipped++;
            else if (userChoice === mcq.answer) { score += 4; correct++; }
            else { score -= 1; incorrect++; }
        });
        return { finalScore: score, correctCount: correct, incorrectCount: incorrect, skippedCount: skipped };
    }, [isFinished, mcqs, answers]);

    const handleGetAdvice = async () => {
        if (!data) return;
        setIsLoadingAdvice(true);
        setAdvice(null);
        addDebugLog('AI Advice', 'pending', 'Generating performance advice...');
        try {
            const topicScores: Record<string, { correct: number, total: number }> = {};
            mcqs.forEach((mcq, index) => {
                if (!topicScores[mcq.topic]) topicScores[mcq.topic] = { correct: 0, total: 0 };
                topicScores[mcq.topic].total++;
                if (answers[index] === mcq.answer) topicScores[mcq.topic].correct++;
            });
            const topicPerformance = Object.entries(topicScores).map(([topic, scores]) => ({
                topic, accuracy: scores.total > 0 ? (scores.correct / scores.total) * 100 : 0,
            })).sort((a, b) => a.accuracy - b.accuracy);
            const weakTopics = topicPerformance.slice(0, 2).map(t => t.topic);
            const strongTopics = topicPerformance.slice(-2).reverse().map(t => t.topic);
            const overallAccuracy = mcqs.length > 0 ? (correctCount / mcqs.length) * 100 : 0;
            const adviceText = await aiService.getPerformanceAdvice({ strongTopics, weakTopics, overallAccuracy });
            setAdvice(adviceText);
            addDebugLog('AI Advice', 'success', 'Performance advice generated.');
        } catch (error: any) {
            // FIX: Corrected variable name from 'e' to 'error'
            setAdvice(`Error generating advice: ${error.message}`);
            addDebugLog('AI Advice', 'error', `Failed to generate advice: ${error.message}`);
        }
        finally { setIsLoadingAdvice(false); }
    };
    
    // Ensure currentMcq is available before rendering
    if (!currentMcq) {
        if (mcqs.length === 0 && (mode === "wrong" || chapterId)) {
            return (<div className="text-center p-8 rounded-lg bg-white dark:bg-slate-800"><h1 className="text-2xl font-bold">Session Empty</h1><p className="mt-4 text-slate-500">No questions available for this session.</p><button onClick={() => navigate(-1)} className="mt-6 px-6 py-2 rounded-md bg-sky-500 text-white">Back</button></div>);
        }
        // This is primarily for initial data load or if currentMcq is somehow null unexpectedly
        return <Loader message="Loading Session..." />;
    }

    const getOptionStyle = (optionKey: "A" | "B" | "C" | "D") => {
        const isSelected = optionKey === answers[currentIndex];
        if (showAnswer) {
            if (optionKey === currentMcq.answer) return "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 ring-2 ring-green-500";
            if (isSelected) return "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300 ring-2 ring-red-500";
        }
        if (isSelected) return "bg-sky-200 dark:bg-sky-800 ring-2 ring-sky-500";
        return "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600";
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-xl font-bold">Q. {currentIndex + 1}/{mcqs.length}</h1>
                <div className="flex items-center space-x-2">
                    {user?.isAdmin && (<button onClick={() => handleDeleteMCQ(currentMcq.id)} disabled={isDeleting} title="Delete MCQ" className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>)}
                    <button onClick={() => toggleBookmark(currentMcq.id)} className={`p-2 rounded-full ${bookmarks.includes(currentMcq.id) ? "text-amber-500 bg-amber-100 dark:bg-amber-800/50" : "text-slate-400 hover:text-amber-400"}`}><BookmarkIcon filled={bookmarks.includes(currentMcq.id)} /></button>
                </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
                <p className="text-lg font-semibold mb-4">{currentMcq.question}</p>
                <div className="space-y-3">
                    {(["A", "B", "C", "D"] as const).map((optionKey, idx) => (
                        <button key={idx} onClick={() => handleSelectOption(optionKey)} disabled={showAnswer || isFinished} className={`w-full text-left p-4 rounded-lg flex items-start transition-colors ${getOptionStyle(optionKey)}`}>
                            <span className="font-bold mr-3">{optionKey}.</span>
                            <span>{currentMcq.options[idx]}</span>
                        </button>
                    ))}
                </div>
                 {showAnswer && (
                    <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/40 rounded-lg animate-fade-in">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-amber-800 dark:text-amber-200">Explanation</h3>
                            {/* Show 'Explain with AI' button only if no explanation exists (neither in local state nor in Firestore data) and not currently loading */}
                            { !currentMcq.explanation && !explanation && !isExplanationLoading && (<button onClick={handleExplain} className="px-3 py-1 text-sm rounded-md bg-sky-500 hover:bg-sky-600 text-white">🤖 Explain with AI</button>) }
                        </div>
                        {/* Display explanation from currentMcq.explanation (Firestore) or from local state (newly generated) */}
                        <p className="mt-2 whitespace-pre-wrap">{explanation || currentMcq.explanation || "No explanation provided."}</p>
                        {isExplanationLoading && <p className="mt-4 animate-pulse">Generating AI explanation...</p>}
                    </div>
                )}
            </div>
            <div className="flex justify-between mt-6">
                <button onClick={() => goToQuestion(currentIndex - 1)} disabled={currentIndex === 0} className="px-6 py-2 rounded-md bg-slate-200 hover:bg-slate-300 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600">Previous</button>
                <button onClick={handleNext} disabled={!answers.hasOwnProperty(currentIndex)} className="px-6 py-2 rounded-md bg-sky-500 text-white hover:bg-sky-600 disabled:opacity-50">{currentIndex === mcqs.length - 1 ? "Finish" : "Next"}</button>
            </div>
            <QuestionNavigator count={mcqs.length} currentIndex={currentIndex} answers={answers} mcqs={mcqs} goToQuestion={goToQuestion} mode={mode} isFinished={isFinished} />
        </div>
    );
};

export default MCQSessionPage;