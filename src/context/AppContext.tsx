import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { reconnectFirestore } from '../lib/firebase';

interface AppContextType {
  setLoading: (loading: boolean) => void;
  isOnline: boolean;
  retryAction: (() => Promise<void>) | null;
  setRetryAction: (action: (() => Promise<void>) | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryAction, setRetryAction] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      reconnectFirestore();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = async () => {
    if (retryAction) {
      setLoading(true);
      try {
        await retryAction();
        setRetryAction(null);
      } catch (error) {
        console.error("Retry failed:", error);
      } finally {
        setLoading(false);
      }
    } else {
      // Default retry is just to reconnect
      await reconnectFirestore();
    }
  };

  return (
    <AppContext.Provider value={{ setLoading, isOnline, retryAction, setRetryAction }}>
      {children}
      
      {/* Global Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="flex flex-col items-center gap-4">
              <img 
                src="/src/assets/images/lod_animation_1790308985475.jpg" 
                alt="Loading..." 
                className="w-24 h-24 object-contain animate-pulse"
              />
              <p className="text-brand-gold font-medium tracking-widest animate-pulse">DOHER AI GALLERY</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
