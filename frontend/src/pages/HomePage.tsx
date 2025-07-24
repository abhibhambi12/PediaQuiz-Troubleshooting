// /home/abhibhambi12/PediaQuiz/frontend/src/pages/HomePage.tsx

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { useToast } from '@/components/Toast';
import { ChevronDownIcon, ChevronRightIcon, BookIcon, BrainIcon } from '@/components/Icons';
import Loader from '@/components/Loader';
import * as aiService from '@/services/aiService';
import type { Chapter, Topic } from '@/types.ts';

const HomePage = () => {
    const { data, loading, error, attempted } = useData();
    const { addToast } = useToast();
    const navigate = useNavigate();
    const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
    const [isGeneratingTest, setIsGeneratingTest] = useState(false);

    const toggleTopic = (topicId: string) => {
        setExpandedTopics(prev => {
            const newSet = new Set(prev);
            if (newSet.has(topicId)) newSet.delete(topicId);
            else newSet.add(topicId);
            return newSet;
        });
    };

    const handleGenerateWeaknessTest = async () => {
        if (!data) return;
        setIsGeneratingTest(true);
        try {
            const { mcqIds } = await aiService.generateWeaknessTest(attempted, data.mcqs, 20);
            if (mcqIds.length === 0) {
                addToast("Not enough data to generate a test. Please attempt more questions.", "info");
                setIsGeneratingTest(false);
                return;
            }
            navigate('/session/weakness/quiz', {
                state: { generatedMcqIds: mcqIds }
            });
        } catch (e: any) {
            addToast(`Error generating test: ${e.message}`, "error");
            setIsGeneratingTest(false);
        }
    };

    if (loading) return <Loader message="Loading study data..." />;
    if (error) return <div className="text-center py-4 text-red-500 bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">{error}</div>;
    if (!data || data.topics.length === 0) return <div className="text-center py-10">No topics found.</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Study Topics</h1>
            <div className="space-y-3">
                <Link to="/custom-test-builder" className="block w-full text-center p-4 rounded-xl shadow-md bg-sky-500 hover:bg-sky-600 text-white font-bold text-lg transition-colors">
                    Build a Custom Test
                </Link>
                <button
                    onClick={handleGenerateWeaknessTest}
                    disabled={isGeneratingTest || Object.keys(attempted).length < 10}
                    className="flex items-center justify-center gap-3 w-full text-center p-4 rounded-xl shadow-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <BrainIcon />
                    {isGeneratingTest ? "Generating..." : "🎯 Start AI Weakness Test"}
                </button>
                {Object.keys(attempted).length < 10 && <p className="text-xs text-center text-slate-500 dark:text-slate-400">Attempt at least 10 questions to unlock the AI test.</p>}
                {data.topics.map((topic: Topic) => {
                    const isExpanded = expandedTopics.has(topic.id);
                    const chaptersInTopic = (topic.chapters as Chapter[]);
                    return (
                        <div key={topic.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden transition-all">
                            <div className="w-full text-left p-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <div onClick={() => toggleTopic(topic.id)} className="flex-grow cursor-pointer">
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-200">{topic.name}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{topic.chapterCount} Chapters | {topic.totalMcqCount} MCQs</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Link to={`/flashcards/topic/${topic.id}`} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700" title="Practice Flashcards for this Topic">
                                        <BookIcon />
                                    </Link>
                                    <button onClick={() => toggleTopic(topic.id)} className="p-1">
                                        <ChevronDownIcon className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                            </div>
                            {isExpanded && (
                                <div id={`chapters-for-${topic.id}`} className="p-4 border-t border-slate-200 dark:border-slate-700 animate-fade-in">
                                    <ul className="space-y-2">
                                        {chaptersInTopic.map((chapter: Chapter) => (
                                            <li key={chapter.id}>
                                                <Link to={`/chapter/${chapter.id}`} className="block p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors">
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="font-medium text-slate-700 dark:text-slate-300">{chapter.name}</p>
                                                            <p className="text-sm text-slate-500 dark:text-slate-400">{chapter.mcqCount} MCQs</p>
                                                        </div>
                                                        <ChevronRightIcon />
                                                    </div>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HomePage;