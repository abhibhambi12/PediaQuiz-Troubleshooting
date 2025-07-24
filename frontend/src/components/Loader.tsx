// Removed React import
// import React from 'react';
import { LoaderIcon } from './Icons';

const Loader = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
        <LoaderIcon />
        <p className="mt-4 text-lg font-medium text-slate-500 dark:text-slate-400">{message}</p>
    </div>
);

export default Loader;