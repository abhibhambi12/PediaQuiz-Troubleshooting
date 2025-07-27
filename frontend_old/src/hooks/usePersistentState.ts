import { useState, useEffect } from 'react';

export const usePersistentState = <T,>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
    const [state, setState] = useState<T>(() => {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : defaultValue;
        } catch (e) {
            console.error(`Failed to parse ${key} from localStorage`, e);
            localStorage.removeItem(key);
            return defaultValue;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(key, JSON.stringify(state));
        } catch (e) {
            console.error(`Failed to save ${key} to localStorage`, e);
        }
    }, [key, state]);

    return [state, setState];
};