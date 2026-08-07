import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
    total: number;
    skip: number;
    limit: number;
    onPageChange: (skip: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({ total, skip, limit, onPageChange }) => {
    const { t, i18n } = useTranslation('common');
    const currentPage = Math.floor(skip / limit) + 1;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const from = total === 0 ? 0 : skip + 1;
    const to = Math.min(skip + limit, total);

    if (totalPages <= 1) return null;

    const goTo = (page: number) => {
        const clamped = Math.max(1, Math.min(page, totalPages));
        onPageChange((clamped - 1) * limit);
    };

    // Build visible page numbers: always show first, last, current, and neighbors
    const pages: (number | '...')[] = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
            pages.push(i);
        } else if (pages[pages.length - 1] !== '...') {
            pages.push('...');
        }
    }

    return (
        <div className="flex items-center justify-between py-3 px-1 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                {t('pagination.range', { from, to, total: total.toLocaleString(i18n.language) })}
            </span>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => goTo(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label={t('pagination.previous')}
                >
                    <ChevronLeft size={14} />
                </button>
                {pages.map((p, i) =>
                    p === '...' ? (
                        <span key={`ellipsis-${i}`} className="px-1 text-slate-400">...</span>
                    ) : (
                        <button
                            key={p}
                            onClick={() => goTo(p)}
                            className={`min-w-[28px] h-7 rounded-md font-bold transition-colors ${
                                p === currentPage
                                    ? 'bg-[#0066FF] text-white shadow-sm'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                            {p}
                        </button>
                    )
                )}
                <button
                    onClick={() => goTo(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label={t('pagination.next')}
                >
                    <ChevronRight size={14} />
                </button>
            </div>
        </div>
    );
};
