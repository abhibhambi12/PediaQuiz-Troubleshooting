// /home/abhibhambi12/PediaQuiz/frontend/src/pages/FlashcardSessionPage.tsx

import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '@/contexts/DataContext';
import { BackIcon } from '@/components/Icons';
import Loader from '@/components/Loader';
import { Flashcard, Topic, Chapter } from '@/types.ts';

const FlashcardSessionPage = () => {
  const { mode, id } = useParams<{ mode: 'topic' | 'chapter'; id: string }>();
  const { data } = useData();
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const { flashcards, title } = useMemo(() => {
    if (!data || !data.flashcards || !id) return { flashcards: [], title: 'Loading...' };

    let filteredFlashcards: Flashcard[] = [];
    let pageTitle = '';

    if (mode === 'topic') {
      filteredFlashcards = data.flashcards.filter((fc: Flashcard) => fc.topic === id);
      pageTitle = data.topics.find((t: Topic) => t.id === id)?.name || id;
    } else { // chapter mode
      filteredFlashcards = data.flashcards.filter((fc: Flashcard) => fc.chapter === id);
      for (const topic of data.topics) {
        const chapter = topic.chapters.find((c: Chapter) => c.id === id);
        if (chapter) {
          pageTitle = chapter.name;
          break;
        }
      }
    }
    return { flashcards: filteredFlashcards, title: pageTitle };
  }, [data, mode, id]);

  const handleNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  if (!data) return <Loader message="Loading flashcards..." />;
  const currentCard = flashcards[currentIndex];

  if (flashcards.length === 0) {
    return (
      <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold">No Flashcards Found</h1>
        <p className="text-slate-500 mt-2">No flashcards are available for {title}.</p>
        <button onClick={() => navigate(-1)} className="mt-6 px-6 py-2 rounded-md bg-sky-500 text-white">Back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center space-x-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-sky-600 mb-4 self-start">
        <BackIcon />
        <span>Back</span>
      </button>
      <h1 className="text-2xl font-bold text-center mb-2">{title}</h1>
      <p className="text-center text-slate-500 mb-4">Card {currentIndex + 1} of {flashcards.length}</p>
      <div className="flex-grow flex items-center justify-center [perspective:1000px]">
        <div onClick={() => setIsFlipped(!isFlipped)} className={`relative w-full h-80 rounded-xl shadow-lg cursor-pointer transition-transform duration-700 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
          <div className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center p-6 [backface-visibility:hidden]">
            <p className="text-2xl font-semibold text-center">{currentCard.front}</p>
          </div>
          <div className="absolute inset-0 bg-sky-100 dark:bg-sky-900/80 rounded-xl flex items-center justify-center p-6 [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <p className="text-lg text-center text-slate-800 dark:text-slate-200">{currentCard.back}</p>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-6">
        <button onClick={handlePrev} disabled={currentIndex === 0} className="px-6 py-2 rounded-md bg-slate-200 dark:bg-slate-700 disabled:opacity-50">Previous</button>
        <button onClick={handleNext} disabled={currentIndex === flashcards.length - 1} className="px-6 py-2 rounded-md bg-sky-500 text-white disabled:opacity-50">Next</button>
      </div>
    </div>
  );
};

export default FlashcardSessionPage;