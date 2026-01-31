import React, { useState } from 'react';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top' }) => {
    const [isVisible, setIsVisible] = useState(false);

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
        left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
        right: 'left-full top-1/2 -translate-y-1/2 ml-1.5'
    };

    return (
        <div 
            className="relative flex items-center"
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div className={`absolute ${positionClasses[position]} z-[100] px-2 py-1 text-xs font-bold text-white bg-slate-900 rounded shadow-lg whitespace-nowrap`}>
                    {content}
                    {/* Arrow */}
                    <div className={`absolute w-2 h-2 bg-slate-900 transform rotate-45 
                        ${position === 'top' ? '-bottom-1 left-1/2 -translate-x-1/2' : ''}
                        ${position === 'bottom' ? '-top-1 left-1/2 -translate-x-1/2' : ''}
                        ${position === 'left' ? '-right-1 top-1/2 -translate-y-1/2' : ''}
                        ${position === 'right' ? '-left-1 top-1/2 -translate-y-1/2' : ''}
                    `} />
                </div>
            )}
        </div>
    );
};