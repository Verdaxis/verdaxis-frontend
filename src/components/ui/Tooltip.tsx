import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
    content: string;
    children: React.ReactNode;
    position?: 'top' | 'bottom' | 'left' | 'right';
    className?: string;
    portal?: boolean;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, position = 'top', className = '', portal = false }) => {
    const [isVisible, setIsVisible] = useState(false);
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});

    const positionClasses = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
        left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
        right: 'left-full top-1/2 -translate-y-1/2 ml-1.5'
    };

    useLayoutEffect(() => {
        if (!portal || !isVisible || !triggerRef.current) return;

        const rect = triggerRef.current.getBoundingClientRect();
        const gap = 8;
        const base: React.CSSProperties = { position: 'fixed' };

        if (position === 'top') {
            base.left = rect.left + rect.width / 2;
            base.top = rect.top - gap;
            base.transform = 'translate(-50%, -100%)';
        } else if (position === 'bottom') {
            base.left = rect.left + rect.width / 2;
            base.top = rect.bottom + gap;
            base.transform = 'translateX(-50%)';
        } else if (position === 'left') {
            base.left = rect.left - gap;
            base.top = rect.top + rect.height / 2;
            base.transform = 'translate(-100%, -50%)';
        } else {
            base.left = rect.right + gap;
            base.top = rect.top + rect.height / 2;
            base.transform = 'translateY(-50%)';
        }

        setPortalStyle(base);
    }, [isVisible, portal, position]);

    const tooltip = (
        <div
            ref={tooltipRef}
            style={portal ? portalStyle : undefined}
            className={`${portal ? 'fixed' : `absolute ${positionClasses[position]}`} z-[100] max-w-[280px] px-2 py-1 text-xs font-bold text-white bg-slate-900 rounded shadow-lg ${portal ? 'whitespace-normal' : 'whitespace-nowrap'}`}
        >
            {content}
            {!portal && (
                <div className={`absolute w-2 h-2 bg-slate-900 transform rotate-45 
                    ${position === 'top' ? '-bottom-1 left-1/2 -translate-x-1/2' : ''}
                    ${position === 'bottom' ? '-top-1 left-1/2 -translate-x-1/2' : ''}
                    ${position === 'left' ? '-right-1 top-1/2 -translate-y-1/2' : ''}
                    ${position === 'right' ? '-left-1 top-1/2 -translate-y-1/2' : ''}
                `} />
            )}
        </div>
    );

    return (
        <div 
            ref={triggerRef}
            className={`${portal ? '' : 'relative '}flex items-center ${className}`}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (portal ? createPortal(tooltip, document.body) : tooltip)}
        </div>
    );
};
