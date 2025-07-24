// /home/abhibhambi12/PediaQuiz/frontend/src/pages/BookmarksPage.tsx

import { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { BookmarkIcon, ChevronDownIcon, ChevronRightIcon } from '../components/Icons';
import type { MCQ, Topic, Chapter } from '@/types.ts';

// This interface describes a Chapter that has been enhanced with bookmark-specific data
interface AugmentedChapter extends Chapter {
    bookmarkedMcqCount: number;
    mcqs: MCQ[];
}

// This interface describes a Topic that holds our augmented chapters
interface AugmentedTopic extends Omit<Topic, 'chapters'> {
    bookmarkedMcqCount: number;
    chapters: AugmentedChapter[];
}

const BookmarksPage = () => {
    const { data, bookmarks, toggleBookmark } = useData();
    const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
    const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

    const bookmarkedHierarchy: AugmentedTopic[] = useMemo(() => {
        if (!data || !bookmarks || bookmarks.length === 0) return [];

        const bookmarkedMcqMap = new Map<string, MCQ>();
        data.mcqs.forEach((mcq: MCQ) => {
            if (bookmarks.includes(mcq.id)) {
                bookmarkedMcqMap.set(mcq.id, mcq);
            }
        });

        const hierarchy: AugmentedTopic[] = [];

        data.topics.forEach((topic: Topic) => {
            const topicBookmarks: AugmentedChapter[] = [];
            let totalTopicBookmarks = 0;

            topic.chapters.forEach((chapter: Chapter) => {
                const chapterBookmarks: MCQ[] = [];
                for (const mcqId of bookmarks) {
                    const mcq = bookmarkedMcqMap.get(mcqId);
                    if (mcq && mcq.chapter === chapter.id) {
                        chapterBookmarks.push(mcq);
                    }
                }

                if (chapterBookmarks.length > 0) {
                    chapterBookmarks.sort((a, b) => a.question.localeCompare(b.question));
                    topicBookmarks.push({
                        ...chapter,
                        bookmarkedMcqCount: chapterBookmarks.length,
                        mcqs: chapterBookmarks,
                    });
                    totalTopicBookmarks += chapterBookmarks.length;
                }
            });

            if (totalTopicBookmarks > 0) {
                topicBookmarks.sort((a, b) => a.name.localeCompare(b.name));
                hierarchy.push({ ...topic, bookmarkedMcqCount: totalTopicBookmarks, chapters: topicBookmarks });
            }
        });
        hierarchy.sort((a, b) => a.name.localeCompare(b.name));
        return hierarchy;
    }, [data, bookmarks]);

    const toggleTopic = (topicId: string) => {
        setExpandedTopics(prev => {
            const newSet = new Set(prev);
            if (newSet.has(topicId)) newSet.delete(topicId); else newSet.add(topicId);
            return newSet;
        });
    };

    const toggleChapter = (chapterId: string) => {
        setExpandedChapters(prev => {
            const newSet = new Set(prev);
            if (newSet.has(chapterId)) newSet.delete(chapterId); else newSet.add(chapterId);
            return newSet;
        });
    };

    if (!data) return (<div className="text-center py-10"><p>Loading bookmarks...</p></div>);
    if (bookmarks.length === 0) return (<div className="text-center py-10"><h1 className="text-2xl font-bold">No Bookmarks Yet</h1><p>Click the bookmark icon during a quiz to save questions here.</p></div>);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Bookmarked Questions</h1>
            <div className="space-y-4">
                {bookmarkedHierarchy.map((topic: AugmentedTopic) => (
                    <div key={topic.id} className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden">
                        <button onClick={() => toggleTopic(topic.id)} className="w-full text-left p-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-lg">{topic.name}</h3>
                                <p className="text-sm text-slate-500">{topic.bookmarkedMcqCount} Bookmarked</p>
                            </div>
                            <ChevronDownIcon className={`transition-transform ${expandedTopics.has(topic.id) ? 'rotate-180' : ''}`} />
                        </button>
                        {expandedTopics.has(topic.id) && (
                            <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                                {topic.chapters.map((chapter: AugmentedChapter) => (
                                    <div key={chapter.id} className="bg-slate-50 dark:bg-slate-700/50 rounded-lg overflow-hidden mb-3">
                                        <button onClick={() => toggleChapter(chapter.id)} className="w-full text-left p-3 flex justify-between items-center">
                                            <div>
                                                <p className="font-medium">{chapter.name}</p>
                                                <p className="text-sm text-slate-500">{chapter.bookmarkedMcqCount} MCQs</p>
                                            </div>
                                            <ChevronRightIcon className={`transition-transform ${expandedChapters.has(chapter.id) ? 'rotate-90' : ''}`} />
                                        </button>
                                        {expandedChapters.has(chapter.id) && (
                                            <ul className="space-y-2 p-3 border-t border-slate-200 dark:border-slate-700">
                                                {chapter.mcqs.map((mcq: MCQ) => (
                                                    <li key={mcq.id} className="relative p-3 rounded-lg bg-white dark:bg-slate-800 shadow-sm">
                                                        <button onClick={() => toggleBookmark(mcq.id)} className="absolute top-2 right-2 p-1 text-amber-500" aria-label="Remove bookmark">
                                                            <BookmarkIcon filled={true} />
                                                        </button>
                                                        <p className="font-semibold mb-2 pr-8">{mcq.question}</p>
                                                        <div className="text-sm">
                                                            <p>Answer: <strong>{mcq.answer}</strong>. {mcq.options[mcq.answer.charCodeAt(0) - 'A'.charCodeAt(0)]}</p>
                                                            {mcq.explanation && <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">Explanation: {mcq.explanation}</p>}
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default BookmarksPage;