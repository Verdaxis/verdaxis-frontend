import React, { createContext, useContext, useState, useEffect } from 'react';

const COMPLETED_KEY = 'verdaxis_tutorial_completed';
const PENDING_KEY = 'verdaxis_tutorial_pending';

interface TutorialContextValue {
    isRunning: boolean;
    hasCompleted: boolean;
    start: () => void;
    complete: () => void;
    reset: () => void;
}

const TutorialContext = createContext<TutorialContextValue>({
    isRunning: false,
    hasCompleted: false,
    start: () => {},
    complete: () => {},
    reset: () => {},
});

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isRunning, setIsRunning] = useState(false);
    const [hasCompleted, setHasCompleted] = useState(() => {
        return localStorage.getItem(COMPLETED_KEY) === 'true';
    });

    // Auto-start if the pending flag was set by OnboardingPage before redirect
    useEffect(() => {
        const pending = localStorage.getItem(PENDING_KEY);
        if (pending === 'true') {
            localStorage.removeItem(PENDING_KEY);
            const timer = setTimeout(() => setIsRunning(true), 900);
            return () => clearTimeout(timer);
        }
    }, []);

    const start = () => setIsRunning(true);

    const complete = () => {
        setIsRunning(false);
        setHasCompleted(true);
        localStorage.setItem(COMPLETED_KEY, 'true');
    };

    const reset = () => {
        setHasCompleted(false);
        localStorage.removeItem(COMPLETED_KEY);
    };

    return (
        <TutorialContext.Provider value={{ isRunning, hasCompleted, start, complete, reset }}>
            {children}
        </TutorialContext.Provider>
    );
};

export const useTutorial = () => useContext(TutorialContext);

/** Call this before redirecting a new user to /app to auto-start the tour */
export const scheduleTutorial = () => {
    localStorage.setItem(PENDING_KEY, 'true');
};
