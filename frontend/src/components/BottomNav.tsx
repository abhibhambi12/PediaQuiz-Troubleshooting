
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, BookmarkIcon, ChartBarIcon, CogIcon } from './Icons';

const BottomNav = () => {
    const location = useLocation();
    const navItems = [
        { path: '/', icon: <HomeIcon />, label: 'Home' },
        { path: '/bookmarks', icon: <BookmarkIcon />, label: 'Bookmarks' },
        { path: '/stats', icon: <ChartBarIcon />, label: 'Stats' },
        { path: '/settings', icon: <CogIcon />, label: 'Settings' },
    ];
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-slate-200 dark:border-slate-700 z-20">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-4">
                {navItems.map(item => {
                    const isActive = location.pathname === item.path;
                    return (
                        <Link key={item.path} to={item.path} className={`flex flex-col items-center justify-center text-center py-2 transition-colors duration-200 ${isActive ? 'text-sky-500' : 'text-slate-500 hover:text-sky-500'}`}>
                            {item.icon}
                            <span className="text-xs font-medium mt-1">{item.label}</span>
                        </Link>
                    )
                })}
            </div>
        </nav>
    );
};

export default BottomNav;