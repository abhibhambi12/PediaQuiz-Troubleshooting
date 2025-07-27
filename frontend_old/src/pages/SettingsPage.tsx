import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { SunIcon, MoonIcon } from '../components/Icons';
import { useToast } from '../components/Toast';

const SettingsPage = () => {
    const { user, theme, setTheme, resetProgress, refreshData, showDebug, toggleDebug, refreshIdToken, grantAdmin } = useData();
    const { addToast } = useToast();

    const handleReset = () => {
        if (window.confirm("Are you sure you want to reset all your progress? This action cannot be undone.")) {
            resetProgress();
        }
    };

    const handleRefreshIdToken = () => {
        refreshIdToken();
        addToast("ID Token refresh initiated. Check debug log.", "info");
    };

    const handleGrantAdmin = async () => {
        if (!user || !user.uid) {
            addToast("You must be logged in to grant admin role.", "error");
            return;
        }
        if (window.confirm(`Grant admin privileges to your user (${user.email})?`)) {
            try {
                await grantAdmin(user.uid);
                addToast("Admin role granted! Please check debug log for status.", "success");
            } catch (error: any) {
                addToast(`Failed to grant admin: ${error.message}`, "error");
            }
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold mb-6 text-slate-800 dark:text-slate-200">Settings</h1>
            <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm">
                    <h2 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-200">Appearance</h2>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-700 dark:text-slate-300">Theme</span>
                        <div className="flex items-center space-x-2 p-1 bg-slate-200 dark:bg-slate-700 rounded-full">
                            <button onClick={() => setTheme('light')} className={`p-1.5 rounded-full transition-colors ${theme === 'light' ? 'bg-white shadow' : ''}`}><SunIcon/></button>
                            <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-full ${theme === 'dark' ? 'bg-slate-800 shadow' : ''}`}><MoonIcon/></button>
                        </div>
                    </div>
                </div>

                 <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm">
                    <h2 className="font-bold text-lg mb-2 text-slate-800 dark:text-slate-200">Data Management</h2>
                    <div className="space-y-3">
                        {user && !user.isAdmin && (
                            <button onClick={handleGrantAdmin} className="block w-full text-left p-3 rounded-lg bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors font-semibold">
                                Grant Admin Role to My User
                            </button>
                        )}
                        {user?.isAdmin && (
                            <>
                                <button onClick={handleRefreshIdToken} className="block w-full text-left p-3 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors font-semibold">
                                    Refresh Admin Status
                                </button>
                                <Link to="/admin/review" className="block w-full text-left p-3 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors font-semibold">
                                    👑 Admin Review Queue
                                </Link>
                                <Link to="/generator" className="block w-full text-left p-3 rounded-lg bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors font-semibold">
                                    ✨ AI Content Factory
                                </Link>
                            </>
                        )}
                        <button onClick={refreshData} className="w-full text-left p-3 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-slate-700 dark:text-slate-300">Refresh MCQ Data</button>
                        <button onClick={handleReset} className="w-full text-left p-3 rounded-lg bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors">Reset All Progress</button>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm">
                     <button onClick={toggleDebug} className="w-full text-left font-bold text-lg text-slate-800 dark:text-slate-200">
                         {showDebug ? 'Hide Live Debug Log' : 'Show Live Debug Log'}
                     </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;