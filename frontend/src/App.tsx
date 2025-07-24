import { Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider, useData } from '@/contexts/DataContext';
import { ToastProvider } from '@/components/Toast';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import BottomNav from '@/components/BottomNav';
import Loader from '@/components/Loader';
import AdminRoute from '@/components/AdminRoute';
import AdminReviewPage from '@/pages/AdminReviewPage';
import GeneratorPage from '@/pages/GeneratorPage';
import HomePage from '@/pages/HomePage';
import ChapterDetailPage from '@/pages/ChapterDetailPage';
import MCQSessionPage from '@/pages/MCQSessionPage';
import BookmarksPage from '@/pages/BookmarksPage';
import StatsPage from '@/pages/StatsPage';
import SettingsPage from '@/pages/SettingsPage';
import AuthPage from '@/pages/AuthPage';
import CustomTestBuilder from '@/pages/CustomTestBuilder';
import LogScreenPage from '@/pages/LogScreenPage';
import DebugView from '@/components/DebugView';
import FlashcardSessionPage from '@/pages/FlashcardSessionPage';

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { user, authLoading } = useData();
  if (authLoading) return <Loader message="Authenticating..." />;
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

const AuthRedirect = () => {
  const { user, authLoading } = useData();
  if (authLoading) return <Loader message="Checking session..." />;
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
};

function App() {
  return (
    <DataProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </DataProvider>
  );
}

const AppContent = () => {
  const { showDebug } = useData();
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <Header />
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8 pb-24">
        <AppRoutes />
      </main>
      <BottomNav />
      <Footer />
      {showDebug && <DebugView />}
    </div>
  );
};

const AppRoutes = () => {
  const { loading, authLoading } = useData();
  if (loading && !authLoading) return <Loader message="Loading data..." />;
  return (
    <Routes>
      <Route path="/auth" element={<AuthRedirect />} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/chapter/:chapterId" element={<ProtectedRoute><ChapterDetailPage /></ProtectedRoute>} />
      <Route path="/session/:chapterId/:mode" element={<ProtectedRoute><MCQSessionPage /></ProtectedRoute>} />
      <Route path="/flashcards/:mode/:id" element={<ProtectedRoute><FlashcardSessionPage /></ProtectedRoute>} />
      <Route path="/custom-test-builder" element={<ProtectedRoute><CustomTestBuilder /></ProtectedRoute>} />
      <Route path="/bookmarks" element={<ProtectedRoute><BookmarksPage /></ProtectedRoute>} />
      <Route path="/stats" element={<ProtectedRoute><StatsPage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/generator" element={<AdminRoute><GeneratorPage /></AdminRoute>} />
      <Route path="/admin/review" element={<AdminRoute><AdminReviewPage /></AdminRoute>} />
      <Route path="/logs" element={<AdminRoute><LogScreenPage /></AdminRoute>} />
      <Route path="*" element={<h2 className="text-center text-xl font-bold mt-10">Page Not Found</h2>} />
    </Routes>
  );
};

export default App;