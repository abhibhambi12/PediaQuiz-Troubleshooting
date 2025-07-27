import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';

const Header = () => {
    const { user, logout, authLoading } = useData();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/auth');
    };

    return (
        <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm shadow-sm sticky top-0 z-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <Link to="/" className="text-2xl font-bold text-sky-600 dark:text-sky-400 tracking-tight">PediaQuiz</Link>
                    <div className="flex items-center space-x-4">
                        {user ? (
                            <>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:inline">
                                    {user.displayName || user.email || 'User'}
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="px-3 py-1 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
                                    disabled={authLoading}
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <Link to="/auth" className="px-3 py-1 text-sm rounded-md bg-sky-500 text-white hover:bg-sky-600 transition-colors">
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;