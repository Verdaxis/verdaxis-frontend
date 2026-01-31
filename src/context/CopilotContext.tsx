import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CopilotContextType {
    pageContext: any;
    setPageContext: (data: any) => void;
}

const CopilotContext = createContext<CopilotContextType | undefined>(undefined);

export const CopilotProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [pageContext, setPageContext] = useState<any>(null);

    return (
        <CopilotContext.Provider value={{ pageContext, setPageContext }}>
            {children}
        </CopilotContext.Provider>
    );
};

export const useCopilotContext = () => {
    const context = useContext(CopilotContext);
    if (!context) {
        throw new Error('useCopilotContext must be used within a CopilotProvider');
    }
    return context;
};
