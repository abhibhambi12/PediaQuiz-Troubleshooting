import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

interface ToastNotification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastNotification['type'], duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const addToast = useCallback((message: string, type: ToastNotification['type'] = 'info', duration: number = 3000) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const newToast: ToastNotification = { id, message, type, duration };
    setToasts((prevToasts) => [...prevToasts, newToast]);
  }, []);

  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts((prevToasts) => prevToasts.slice(1));
      }, toasts[0].duration);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] space-y-2 max-w-xs w-full">
        {toasts.map((toast: ToastNotification) => (
          <div
            key={toast.id}
            className={`p-4 rounded-lg shadow-lg text-white font-semibold flex items-center gap-3 transition-all duration-300 ease-out transform
              ${toast.type === 'success' ? 'bg-green-600' :
                toast.type === 'error' ? 'bg-red-600' :
                'bg-blue-600'}
              opacity-100 translate-y-0
            `}
            role="alert"
          >
            {/* You can add SVGs here for icons if you wish */}
            <div>{toast.message}</div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};