import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface VerdaxisSelectOption {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
}

interface VerdaxisSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: VerdaxisSelectOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    triggerClassName?: string;
    menuClassName?: string;
    ariaLabel?: string;
}

export const VerdaxisSelect: React.FC<VerdaxisSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select an option',
    disabled = false,
    className = '',
    triggerClassName = '',
    menuClassName = '',
    ariaLabel,
}) => {
    const [open, setOpen] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const listId = useId();

    const enabledOptions = useMemo(
        () => options.filter(option => !option.disabled),
        [options],
    );
    const selectedOption = options.find(option => option.value === value);

    useEffect(() => {
        if (!open) return;

        const selectedIndex = enabledOptions.findIndex(option => option.value === value);
        setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }, [enabledOptions, open, value]);

    useEffect(() => {
        if (!open) return;

        const handlePointerDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => document.removeEventListener('mousedown', handlePointerDown);
    }, [open]);

    const commitSelection = (nextValue: string) => {
        onChange(nextValue);
        setOpen(false);
        buttonRef.current?.focus();
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (disabled) return;

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) {
                setOpen(true);
                return;
            }

            const direction = event.key === 'ArrowDown' ? 1 : -1;
            const nextIndex = (highlightedIndex + direction + enabledOptions.length) % enabledOptions.length;
            setHighlightedIndex(nextIndex);
            return;
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            if (!open) {
                setOpen(true);
                return;
            }

            const option = enabledOptions[highlightedIndex];
            if (option) commitSelection(option.value);
            return;
        }

        if (event.key === 'Escape') {
            if (open) {
                event.preventDefault();
                setOpen(false);
            }
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <button
                ref={buttonRef}
                type="button"
                role="combobox"
                aria-controls={listId}
                aria-expanded={open}
                aria-haspopup="listbox"
                aria-label={ariaLabel}
                disabled={disabled}
                onClick={() => setOpen(current => !current)}
                onKeyDown={handleKeyDown}
                className={`w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-900 shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#5DADE2]/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 ${triggerClassName}`}
            >
                <span className={selectedOption ? '' : 'text-slate-400 dark:text-slate-500'}>
                    {selectedOption?.label ?? placeholder}
                </span>
                <ChevronDown
                    size={16}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>

            {open && (
                <div
                    id={listId}
                    role="listbox"
                    tabIndex={-1}
                    className={`absolute z-[120] mt-2 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-950 ${menuClassName}`}
                >
                    {options.map(option => {
                        const isSelected = option.value === value;
                        const currentEnabledIndex = enabledOptions.findIndex(item => item.value === option.value);
                        const isHighlighted = currentEnabledIndex >= 0 && currentEnabledIndex === highlightedIndex;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                disabled={option.disabled}
                                onMouseEnter={() => {
                                    if (currentEnabledIndex >= 0) setHighlightedIndex(currentEnabledIndex);
                                }}
                                onClick={() => !option.disabled && commitSelection(option.value)}
                                className={`flex w-full items-start justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                                    option.disabled
                                        ? 'cursor-not-allowed opacity-50'
                                        : isHighlighted
                                            ? 'bg-[#5DADE2]/12 text-slate-900 dark:bg-[#5DADE2]/20 dark:text-slate-50'
                                            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800'
                                }`}
                            >
                                <span className="min-w-0">
                                    <span className="block font-medium">{option.label}</span>
                                    {option.description && (
                                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
                                            {option.description}
                                        </span>
                                    )}
                                </span>
                                <span className="mt-0.5 h-4 w-4 flex-shrink-0">
                                    {isSelected ? <Check size={16} className="text-[#5DADE2]" /> : null}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
