import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { ChevronDownIcon, ChevronRightIcon, BackIcon } from '../components/Icons';
import Loader from '../components/Loader';
import type { Chapter, Topic } from '@pediaquiz/types';

const CustomTestBuilder = () => {
  const { data, loading, error } = useData();
  const navigate = useNavigate();

  const [selectedChapters, setSelectedChapters] = useState<Set<string>>(new Set());
  const [totalQuestions, setTotalQuestions] = useState(20);
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const allAvailableChapters = useMemo(() => {
    if (!data) return [];
    return data.topics.flatMap((topic: Topic) => (topic.chapters as Chapter[]));
  }, [data]);

  const selectedMcqCount = useMemo(() => {
    if (!data) return 0;
    return Array.from(selectedChapters).reduce((count: number, chapterId: string) => {
      const chapter = allAvailableChapters.find((c: Chapter) => c.id === chapterId);
      return count + (chapter?.mcqCount || 0);
    }, 0);
  }, [selectedChapters, data, allAvailableChapters]);

  const handleChapterToggle = (chapterId: string) => {
    setSelectedChapters(prev => {
      const newSet = new Set(prev);
      if (newSet.has(chapterId)) {
        newSet.delete(chapterId);
      } else {
        newSet.add(chapterId);
      }
      return newSet;
    });
  };

  const handleTopicToggle = (chaptersInTopic: Chapter[]) => {
    const newSelectedChapters = new Set(selectedChapters);
    const allInTopicSelected = chaptersInTopic.length > 0 &&
      chaptersInTopic.every((chapter: Chapter) => selectedChapters.has(chapter.id));

    if (allInTopicSelected) {
      chaptersInTopic.forEach((chapter: Chapter) => newSelectedChapters.delete(chapter.id));
    } else {
      chaptersInTopic.forEach((chapter: Chapter) => newSelectedChapters.add(chapter.id));
    }
    setSelectedChapters(newSelectedChapters);
  };

  const toggleTopicExpand = (topicId: string) => {
    setExpandedTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(topicId)) {
        newSet.delete(topicId);
      } else {
        newSet.add(topicId);
      }
      return newSet;
    });
  };

  const handleStartCustomTest = () => {
    if (selectedChapters.size === 0) {
      alert("Please select at least one chapter.");
      return;
    }
    if (totalQuestions <= 0) {
        alert("Please specify a valid number of questions.");
        return;
    }
    if (selectedMcqCount < totalQuestions) {
        alert(`You only have ${selectedMcqCount} questions selected, but requested ${totalQuestions}. Adjust the number of questions.`);
        return;
    }

    navigate('/session/custom/quiz', {
      state: {
        selectedChapterIds: Array.from(selectedChapters),
        totalQuestions: totalQuestions
      }
    });
  };

  if (loading) return <Loader message="Loading study data..." />;
  if (error) return <div className="text-center py-10 text-red-500">{error}</div>;
  if (!data || data.topics.length === 0) return <div className="text-center py-10">No study data available.</div>;

  const isStartButtonDisabled = selectedChapters.size === 0 || totalQuestions <= 0 || selectedMcqCount < totalQuestions;

  return (
    <div className="space-y-6">
        <button onClick={() => navigate('/')} className="flex items-center space-x-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 mb-6">
            <BackIcon />
            <span>Back to Home</span>
        </button>
      <h1 className="text-3xl font-bold">Build Custom Test</h1>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md space-y-4">
        <h2 className="text-xl font-bold">Test Configuration</h2>
        <div>
          <label htmlFor="numQuestions" className="block text-sm font-medium mb-1">
            Number of Questions (Max: {selectedMcqCount})
          </label>
          <input
            type="number"
            id="numQuestions"
            min="1"
            max={selectedMcqCount > 0 ? selectedMcqCount : 1}
            value={totalQuestions}
            onChange={(e) => setTotalQuestions(Math.max(1, Math.min(selectedMcqCount, parseInt(e.target.value) || 0)))}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700"
            disabled={selectedMcqCount === 0}
          />
        </div>
        <button
          onClick={handleStartCustomTest}
          disabled={isStartButtonDisabled}
          className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 px-4 rounded-md disabled:opacity-50"
        >
          Start Custom Test
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
        <h2 className="text-xl font-bold mb-4">Select Chapters</h2>
        <div className="space-y-3">
          {data.topics.map((topic: Topic) => {
            const isTopicExpanded = expandedTopics.has(topic.id);
            const chaptersInTopic = (topic.chapters as Chapter[]);
            const allInTopicSelected = chaptersInTopic.length > 0 && chaptersInTopic.every((chapter: Chapter) => selectedChapters.has(chapter.id));

            return (
              <div key={topic.id} className="border border-slate-200 dark:border-slate-700 rounded-lg">
                <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`topic-${topic.id}`}
                      checked={allInTopicSelected}
                      onChange={() => handleTopicToggle(chaptersInTopic)}
                      className="form-checkbox h-5 w-5 text-sky-600 rounded"
                    />
                    <label htmlFor={`topic-${topic.id}`} className="font-medium cursor-pointer">
                      {topic.name}
                    </label>
                  </div>
                  <button onClick={() => toggleTopicExpand(topic.id)} className="p-1">
                    {isTopicExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                  </button>
                </div>
                {isTopicExpanded && (
                  <div className="p-3 border-t border-slate-200 dark:border-slate-700">
                    <ul className="space-y-2">
                      {chaptersInTopic.map((chapter: Chapter) => (
                        <li key={chapter.id}>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`chapter-${chapter.id}`}
                              checked={selectedChapters.has(chapter.id)}
                              onChange={() => handleChapterToggle(chapter.id)}
                              className="form-checkbox h-5 w-5 text-sky-600 rounded"
                            />
                            <label htmlFor={`chapter-${chapter.id}`} className="cursor-pointer">
                              {chapter.name} ({chapter.mcqCount} MCQs)
                            </label>
                          </div>
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
    </div>
  );
};

export default CustomTestBuilder;