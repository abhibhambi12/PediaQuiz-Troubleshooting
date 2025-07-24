// src/contexts/DataContext.tsx

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { getAppData } from '../services/firestoreService';
import { usePersistentState } from '../hooks/usePersistentState';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { grantAdminRole } from '../services/aiService';
import type { AppData, DataContextType, DebugData, QuizResult, AttemptedMCQs, Theme, AppUser, DebugLog } from '@/types.ts';

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [data, setData] = useState<AppData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [debugData, setDebugData] = useState<DebugData | null>(null);
  const [bookmarks, setBookmarks] = usePersistentState<string[]>('pediaQuizBookmarks', []);
  const [quizHistory, setQuizHistory] = usePersistentState<QuizResult[]>('pediaQuizHistory', []);
  const [attempted, setAttempted] = usePersistentState<AttemptedMCQs>('pediaQuizAttempted', {});
  const [theme, setThemeState] = usePersistentState<Theme>('pediaQuizTheme', 'light');
  const [debugLog, setDebugLog] = useState<DebugLog[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setTheme = (newTheme: Theme) => setThemeState(newTheme);

  const addDebugLog = useCallback((step: string, status: 'pending' | 'success' | 'error', logData?: any) => {
    const newLog: DebugLog = { timestamp: new Date().toISOString(), step, status, data: logData instanceof Error ? { message: logData.message, stack: logData.stack } : logData };
    setDebugLog((prev: DebugLog[]) => [...prev, newLog].slice(-20));
  }, []);

  const toggleDebug = useCallback(() => setShowDebug(prev => !prev), []);

  const fetchUserAndClaims = useCallback(async (firebaseUser: User | null) => {
    setAuthLoading(true);
    if (firebaseUser) {
      try {
        const idTokenResult = await firebaseUser.getIdTokenResult(true);
        const isAdmin = !!idTokenResult.claims.isAdmin;
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName, isAdmin });
      } catch (e: any) { setUser(null); }
    } else {
      setUser(null);
    }
    setAuthLoading(false);
  }, []);
  
  const refreshIdToken = useCallback(async () => { if (auth.currentUser) await fetchUserAndClaims(auth.currentUser); }, [fetchUserAndClaims]);
  const grantAdmin = useCallback(async (uid: string) => { try { await grantAdminRole(uid); await refreshIdToken(); } catch (e: any) { throw e; } }, [refreshIdToken]);
  useEffect(() => { const unsubscribe = onAuthStateChanged(auth, fetchUserAndClaims); return () => unsubscribe(); }, [fetchUserAndClaims]);

  const logout = useCallback(async () => { await signOut(auth); }, []);
  const toggleBookmark = (mcqId: string) => setBookmarks((prev: string[]) => prev.includes(mcqId) ? prev.filter(id => id !== mcqId) : [...prev, mcqId]);
  const addQuizResult = (result: Omit<QuizResult, 'id' | 'date'>) => setQuizHistory((prev: QuizResult[]) => [...prev, { ...result, id: Date.now().toString(), date: new Date().toISOString() }]);
  const addAttempt = (mcqId: string, isCorrect: boolean, selectedAnswer: string | null) => {
    setAttempted((prev: AttemptedMCQs) => ({ ...prev, [mcqId]: { isCorrect, selectedAnswer, lastSeen: Date.now() } }));
  };
  const resetProgress = () => { if (window.confirm("Are you sure?")) { setBookmarks([]); setQuizHistory([]); setAttempted({}); } };
  const loadAppData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { processedData, debugData: fetchedDebugData } = await getAppData();
      setData(processedData);
      setDebugData(fetchedDebugData);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
      setDebugData((prev: DebugData | null) => ({ ...prev, errorMessage: err.message }));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { loadAppData(); }, [loadAppData]);

  const value = useMemo(() => ({
    data, loading, error, debugData,
    bookmarks, toggleBookmark, quizHistory, addQuizResult,
    attempted, addAttempt, theme, setTheme, resetProgress,
    refreshData: loadAppData, user, authLoading, logout,
    debugLog, addDebugLog, showDebug, toggleDebug,
    refreshIdToken, grantAdmin
  }), [
    data, loading, error, debugData, bookmarks, quizHistory, attempted, theme, user, authLoading, debugLog, showDebug,
    toggleBookmark, addQuizResult, addAttempt, setTheme, resetProgress, loadAppData, logout, addDebugLog, toggleDebug, refreshIdToken, grantAdmin
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};