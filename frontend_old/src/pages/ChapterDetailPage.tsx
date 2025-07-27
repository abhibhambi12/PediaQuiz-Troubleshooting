import { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { BackIcon } from '../components/Icons';
import type { Chapter, Topic, MCQ } from '@pediaquiz/types';

const ChapterDetailPage = () => {
    const { chapterId } = useParams<{ chapterId: string }>();
    const { data, attempted } = useData();
    const navigate = useNavigate();

    const { chapter, topic, wrongInChapter } = useMemo(() => {
        if (!data || !chapterId) return { chapter: null, topic: null, wrongInChapter: 0 };
        let foundChapter: Chapter | null = null;
        let foundTopic: Topic | null = null;

        for (const t of data.topics) {
            const ch = (t.chapters as Chapter[]).find((c: Chapter) => c.id === chapterId);
            if (ch) {
                foundChapter = ch;
                foundTopic = t;
                break;
            }
        }

        const mcqsInChapter = data.mcqs.filter((mcq: MCQ) => mcq.chapter === chapterId);
        const wrongInChapterCount = mcqsInChapter.filter((mcq: MCQ) => attempted[mcq.id] && !attempted[mcq.id].isCorrect).length;

        return { chapter: foundChapter, topic: foundTopic, wrongInChapter: wrongInChapterCount };
    }, [data, chapterId, attempted]);

    if (!chapter || !topic) {
        return (
            <div className="text-center py-10">
                <h1 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-200">Chapter not found.</h1>
                <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 rounded-md bg-sky-500 text-white hover:bg-sky-600">Back to Home</button>
            </div>
        );
    }

    const ActionButton = ({ to, title, subtitle, disabled = false, className = '' }: { to: string, title: string, subtitle: string, disabled?: boolean, className?: string }) => (
        <Link to={disabled ? '#' : to} className={`block text-center p-6 rounded-lg shadow transition ${disabled ? 'bg-slate-200 dark:bg-slate-700 cursor-not-allowed text-slate-500 dark:text-slate-400' : className || 'bg-sky-500 hover:bg-sky-600 text-white'}`}>
             <h2 className="text-xl font-bold">{title}</h2>
             <p className="mt-1">{subtitle}</p>
        </Link>
    );

    return (
         <div>
            <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 mb-6">
                <BackIcon />
                <span>Back to Home</span>
            </button>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
                <p className="text-sm text-sky-600 dark:text-sky-400 font-semibold">{topic.name}</p>
                <h1 className="text-3xl font-bold mt-1 mb-2 text-slate-800 dark:text-slate-200">{chapter.name}</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-6">{chapter.mcqCount} questions available</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ActionButton to={`/session/${chapter.id}/practice`} title="Practice Mode" subtitle="Review with instant feedback" />
                    <ActionButton to={`/session/${chapter.id}/quiz`} title="Quiz Mode" subtitle="Test your knowledge" />
                    <ActionButton
                        to={`/session/${chapter.id}/wrong`}
                        title="Practice Mistakes"
                        subtitle={`${wrongInChapter} incorrect questions`}
                        disabled={wrongInChapter === 0}
                        className="bg-red-500 hover:bg-red-600 text-white"
                    />
                    <ActionButton
                        to={`/flashcards/chapter/${chapter.id}`}
                        title="Flashcards"
                        subtitle="Review key concepts"
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                     />
                </div>
            </div>
        </div>
    );
};

export default ChapterDetailPage;