// /home/abhibhambi12/PediaQuiz/frontend/src/pages/StatsPage.tsx

import { useMemo, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getPerformanceAdvice } from '@/services/aiService';
import type { Topic, Chapter, MCQ, QuizResult, AttemptedMCQs } from '@/types.ts';

const StatCard = ({ title, value, colorClass }: { title: string, value: string | number, colorClass?: string }) => (
    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-lg">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <p className={`text-2xl font-bold mt-1 ${colorClass || 'text-slate-800 dark:text-slate-200'}`}>{value}</p>
    </div>
);

const StatsPage = () => {
    const { quizHistory, data, attempted } = useData();
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
    const [advice, setAdvice] = useState<string | null>(null);
    const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);

    const overallStats = useMemo(() => {
        if (!data) return { total: 0, attempted: 0, correct: 0, accuracy: 0 };
        const total = data.mcqs.length;
        const attemptedCount = Object.keys(attempted).length;
        const correctCount = Object.values(attempted).filter((a: AttemptedMCQs[string]) => a.isCorrect).length;
        const accuracy = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;
        return { total, attempted: attemptedCount, correct: correctCount, accuracy };
    }, [data, attempted]);

    const prepDnaData = useMemo(() => {
        if (!data) return { topicPerformance: [], chapterMap: new Map() };
        const mcqsByTopic: Record<string, string[]> = {};
        data.mcqs.forEach((mcq: MCQ) => {
            if (!mcqsByTopic[mcq.topic]) mcqsByTopic[mcq.topic] = [];
            mcqsByTopic[mcq.topic].push(mcq.id);
        });

        const topicPerformance = data.topics.map((topic: Topic) => {
            const topicMcqIds = mcqsByTopic[topic.id] || [];
            const attemptedInTopic = topicMcqIds.filter(id => attempted[id] !== undefined);
            const correctInTopic = attemptedInTopic.filter(id => attempted[id].isCorrect);
            const accuracy = attemptedInTopic.length > 0 ? (correctInTopic.length / attemptedInTopic.length) * 100 : 0;
            return { topic: topic.name, accuracy: Math.round(accuracy), id: topic.id, attemptedCount: attemptedInTopic.length };
        }).filter((t: { attemptedCount: number }) => t.attemptedCount > 0);

        const chapterMap = new Map<string, string>();
        data.topics.flatMap((t: Topic) => t.chapters).forEach((c: Chapter) => {
            chapterMap.set(c.id, c.name);
        });

        return { topicPerformance, chapterMap };
    }, [data, attempted]);

    const handleGetAdvice = async () => {
        setIsLoadingAdvice(true);
        setAdvice(null);
        try {
            const sortedTopics = [...prepDnaData.topicPerformance].sort((a, b) => a.accuracy - b.accuracy);
            const weakTopics = sortedTopics.slice(0, 3).map(t => t.topic);
            const strongTopics = sortedTopics.slice(-3).reverse().map(t => t.topic);
            const adviceText = await getPerformanceAdvice({ strongTopics, weakTopics, overallAccuracy: overallStats.accuracy });
            setAdvice(adviceText);
        } catch (error: any) {
            setAdvice(`Error: Could not generate advice.\n(${error.message})`);
        } finally {
            setIsLoadingAdvice(false);
        }
    };

    const selectedTopicChapters = useMemo(() => {
        if (!selectedTopicId || !data) return [];
        const topic = data.topics.find((t: Topic) => t.id === selectedTopicId);
        if (!topic) return [];

        return topic.chapters.map((chapter: Chapter) => {
            const chapterMcqs = data.mcqs.filter((mcq: MCQ) => mcq.chapter === chapter.id);
            const attemptedInChapter = chapterMcqs.filter((mcq: MCQ) => attempted[mcq.id]);
            const correctInChapter = attemptedInChapter.filter((mcq: MCQ) => attempted[mcq.id].isCorrect);
            const accuracy = attemptedInChapter.length > 0 ? (correctInChapter.length / attemptedInChapter.length) * 100 : 0;
            const shortName = chapter.name.length > 15 ? `${chapter.name.substring(0, 15)}...` : chapter.name;
            return { name: shortName, accuracy: Math.round(accuracy) };
        }).filter((c: { accuracy: number }) => c.accuracy > 0);
    }, [selectedTopicId, data, attempted]);

    const selectedTopicName = selectedTopicId ? data?.topics.find((t: Topic) => t.id === selectedTopicId)?.name : "";

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Performance Stats</h1>
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold mb-4">Overall Progress</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard title="Total MCQs" value={overallStats.total} />
                    <StatCard title="Attempted" value={`${overallStats.attempted} / ${overallStats.total}`} />
                    <StatCard title="Correct" value={overallStats.correct} colorClass="text-green-500" />
                    <StatCard title="Accuracy" value={`${overallStats.accuracy.toFixed(1)}%`} colorClass="text-sky-500" />
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold mb-4">AI Performance Advisor</h2>
                {prepDnaData.topicPerformance.length > 0 ? (
                    <>
                        <button onClick={handleGetAdvice} disabled={isLoadingAdvice} className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-4 rounded-md disabled:opacity-50">
                            {isLoadingAdvice ? "Analyzing..." : "🤖 Get AI-Powered Advice"}
                        </button>
                        {advice && (
                            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                                <div className="prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: advice.replace(/\n/g, "<br />") }} />
                            </div>
                        )}
                    </>
                ) : (
                    <p className="text-center text-slate-500 py-4">
                        Attempt a few quizzes to unlock AI-powered advice.
                    </p>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm">
                <h2 className="text-xl font-bold mb-4">PrepDNA Analysis</h2>
                <h3 className="text-lg font-semibold text-center mb-2">Topic Proficiency</h3>
                <div style={{ width: "100%", height: 300 }}>
                    <ResponsiveContainer>
                        <RadarChart data={prepDnaData.topicPerformance}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="topic" />
                            <Radar name="Accuracy" dataKey="accuracy" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.6} />
                            <Tooltip />
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-6">
                    <h3 className="text-lg font-semibold mb-2">Deep Dive by Topic</h3>
                    <div className="flex flex-wrap gap-2">
                        {prepDnaData.topicPerformance.map(topic => (
                            <button key={topic.id} onClick={() => setSelectedTopicId(topic.id)} className={`px-3 py-1 rounded-full text-sm ${selectedTopicId === topic.id ? "bg-sky-500 text-white" : "bg-slate-200 dark:bg-slate-700"}`}>
                                {topic.topic}
                            </button>
                        ))}
                    </div>
                </div>
                {selectedTopicId && (
                    <div className="mt-6 border-t pt-6">
                        <h3 className="text-lg font-semibold text-center mb-2">Chapter Performance in: {selectedTopicName}</h3>
                        {selectedTopicChapters.length > 0 ? (
                            <div style={{ width: "100%", height: 300 }}>
                                <ResponsiveContainer>
                                    <BarChart data={selectedTopicChapters}>
                                        <XAxis dataKey="name" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="accuracy" fill="#0ea5e9" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <p className="text-center text-slate-500 mt-4">No chapters have been attempted in this topic yet.</p>
                        )}
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm">
                 <h2 className="text-xl font-bold mb-4">Quiz History</h2>
                 {quizHistory.length === 0 ? (
                    <div className="text-center py-6"><p className="text-slate-500">No quiz history yet.</p></div>
                 ) : (
                    <div className="space-y-3">
                        {[...quizHistory].reverse().map((quiz: QuizResult) => (
                            <div key={quiz.id} className="flex justify-between items-center p-3 rounded-lg">
                                <div>
                                    <p className="font-semibold">{prepDnaData.chapterMap.get(quiz.chapterId) || quiz.chapterId}</p>
                                    <p className="text-sm text-slate-500">{new Date(quiz.date).toLocaleDateString()}</p>
                                </div>
                                <div><p className="font-bold text-lg">{quiz.score}/{quiz.totalQuestions}</p></div>
                            </div>
                        ))}
                    </div>
                 )}
            </div>
        </div>
    );
};

export default StatsPage;