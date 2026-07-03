import React, { useMemo, useState } from 'react';

// --- Types ---
export interface DepthLevel {
    price: number;
    quantity: number;
}

export interface OrderbookDepthProps {
    bids: DepthLevel[];
    asks: DepthLevel[];
    fuelType: string;
    region: string;
}

interface AggregatedLevel {
    price: number;
    quantity: number;
    /** Running total of quantity from best price through this level. */
    cumulative: number;
}

// --- Helpers ---

/** Aggregate orders at the same price, sort, and limit to visible depth levels. */
function aggregateLevels(
    orders: DepthLevel[],
    side: 'bid' | 'ask',
    maxLevels: number
): AggregatedLevel[] {
    const byPrice = new Map<number, number>();
    for (const order of orders) {
        byPrice.set(order.price, (byPrice.get(order.price) || 0) + order.quantity);
    }

    let cumulative = 0;
    return [...byPrice.entries()]
        .map(([price, quantity]) => ({ price, quantity }))
        .sort((a, b) => side === 'bid' ? b.price - a.price : a.price - b.price)
        .slice(0, maxLevels)
        .map(level => ({ ...level, cumulative: cumulative += level.quantity }));
}

function formatQty(qty: number): string {
    if (qty >= 1000) return `${(qty / 1000).toFixed(1)}k`;
    return qty.toLocaleString();
}

// --- Component ---
const MAX_LEVELS = 10;
const ROW_HEIGHT = 18;
const PRICE_COL_WIDTH = 130;

export const OrderbookDepth: React.FC<OrderbookDepthProps> = ({
    bids,
    asks,
    fuelType,
    region,
}) => {
    const [hoveredLevel, setHoveredLevel] = useState<{
        side: 'bid' | 'ask';
        index: number;
    } | null>(null);

    const bidLevels = useMemo(() => aggregateLevels(bids, 'bid', MAX_LEVELS), [bids]);
    const askLevels = useMemo(() => aggregateLevels(asks, 'ask', MAX_LEVELS), [asks]);

    // Scale bars to the largest single price-level quantity across both sides.
    const maxVisibleQuantity = useMemo(() => {
        const quantities = [...bidLevels, ...askLevels].map(level => level.quantity);
        return Math.max(...quantities, 1);
    }, [bidLevels, askLevels]);

    // Spread calculation
    const bestBid = bidLevels.length > 0 ? bidLevels[0].price : null;
    const bestAsk = askLevels.length > 0 ? askLevels[0].price : null;
    const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
    const spreadPct = spread != null && bestBid > 0 ? (spread / bestBid) * 100 : null;

    // Total rows to display (pad to show both sides aligned from center)
    const maxRows = Math.max(bidLevels.length, askLevels.length, 1);

    const isEmpty = bidLevels.length === 0 && askLevels.length === 0;

    return (
        <div className="bg-slate-50 dark:bg-[#080808] border border-slate-200 dark:border-[#1a1a1a] rounded">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-100 dark:border-[#181818]">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-[#666] uppercase tracking-widest">
                        Orderbook Depth
                    </span>
                    <span className="text-[9px] text-slate-400 dark:text-[#444]">
                        {fuelType} — {region}
                    </span>
                </div>
                {spread != null && (
                    <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-slate-400 dark:text-[#555] font-bold uppercase tracking-wider">Spread</span>
                        <span className="text-amber-500 font-bold">
                            ${spread.toFixed(2)}
                        </span>
                        <span className="text-slate-500 dark:text-[#444]">
                            ({spreadPct?.toFixed(2) ?? "0.00"}%)
                        </span>
                    </div>
                )}
            </div>

            {isEmpty ? (
                <div className="flex items-center justify-center py-8 text-[10px] text-slate-400 dark:text-[#444]">
                    No orderbook depth data
                </div>
            ) : (
                <div className="px-1 py-1">
                    {/* Column labels */}
                    <div className="flex items-center text-[9px] font-bold text-slate-400 dark:text-[#555] uppercase tracking-wider mb-0.5 px-1">
                        <div className="flex-1 text-right pr-1">Vol</div>
                        <div style={{ width: PRICE_COL_WIDTH }} className="text-center">Price</div>
                        <div className="flex-1 text-left pl-1">Vol</div>
                    </div>

                    {/* Depth rows */}
                    {Array.from({ length: maxRows }).map((_, rowIdx) => {
                        const bidLevel = bidLevels[rowIdx] ?? null;
                        const askLevel = askLevels[rowIdx] ?? null;

                        const bidBarWidth = bidLevel
                            ? (bidLevel.quantity / maxVisibleQuantity) * 100
                            : 0;
                        const askBarWidth = askLevel
                            ? (askLevel.quantity / maxVisibleQuantity) * 100
                            : 0;

                        const isBidHovered =
                            hoveredLevel?.side === 'bid' && hoveredLevel.index === rowIdx;
                        const isAskHovered =
                            hoveredLevel?.side === 'ask' && hoveredLevel.index === rowIdx;

                        return (
                            <div
                                key={rowIdx}
                                className="flex items-center"
                                style={{ height: ROW_HEIGHT }}
                            >
                                {/* Bid side: bar grows right-to-left */}
                                <div
                                    className="flex-1 relative flex items-center justify-end cursor-default group"
                                    style={{ height: ROW_HEIGHT }}
                                    onMouseEnter={() =>
                                        bidLevel && setHoveredLevel({ side: 'bid', index: rowIdx })
                                    }
                                    onMouseLeave={() => setHoveredLevel(null)}
                                >
                                    {bidLevel && (
                                        <>
                                            {/* Cumulative bar */}
                                            <div
                                                className="absolute right-0 top-0.5 bottom-0.5 rounded-l transition-all duration-200"
                                                style={{
                                                    width: `${bidBarWidth}%`,
                                                    backgroundColor: isBidHovered
                                                        ? 'rgba(16, 185, 129, 0.25)'
                                                        : 'rgba(16, 185, 129, 0.12)',
                                                }}
                                            />
                                            {/* Quantity label */}
                                            <span
                                                className={`relative z-10 text-[10px] font-mono pr-1 transition-colors ${
                                                    isBidHovered
                                                        ? 'text-emerald-400 font-bold'
                                                        : 'text-emerald-600 dark:text-emerald-500/70'
                                                }`}
                                            >
                                                {formatQty(bidLevel.quantity)}
                                            </span>
                                        </>
                                    )}

                                    {/* Hover tooltip */}
                                    {isBidHovered && bidLevel && (
                                        <div className="absolute right-0 -top-7 z-50 bg-[#111] border border-[#333] rounded px-2 py-0.5 text-[9px] text-white whitespace-nowrap shadow-xl">
                                            Bid ${bidLevel.price.toFixed(2)} — {bidLevel.quantity.toLocaleString()} MT
                                        </div>
                                    )}
                                </div>

                                {/* Center: price column */}
                                <div
                                    className="text-center shrink-0 flex items-center justify-center"
                                    style={{ width: PRICE_COL_WIDTH, height: ROW_HEIGHT }}
                                >
                                    {bidLevel && askLevel ? (
                                        // Show both prices side-by-side when both exist
                                        <div className="flex items-center gap-0.5 text-[10px] font-mono">
                                            <span className="text-emerald-600 dark:text-emerald-500 font-bold">
                                                {bidLevel.price.toFixed(2)}
                                            </span>
                                            <span className="text-slate-300 dark:text-[#333]">|</span>
                                            <span className="text-rose-600 dark:text-rose-500 font-bold">
                                                {askLevel.price.toFixed(2)}
                                            </span>
                                        </div>
                                    ) : bidLevel ? (
                                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-500 font-bold">
                                            {bidLevel.price.toFixed(2)}
                                        </span>
                                    ) : askLevel ? (
                                        <span className="text-[10px] font-mono text-rose-600 dark:text-rose-500 font-bold">
                                            {askLevel.price.toFixed(2)}
                                        </span>
                                    ) : null}
                                </div>

                                {/* Ask side: bar grows left-to-right */}
                                <div
                                    className="flex-1 relative flex items-center justify-start cursor-default group"
                                    style={{ height: ROW_HEIGHT }}
                                    onMouseEnter={() =>
                                        askLevel && setHoveredLevel({ side: 'ask', index: rowIdx })
                                    }
                                    onMouseLeave={() => setHoveredLevel(null)}
                                >
                                    {askLevel && (
                                        <>
                                            {/* Cumulative bar */}
                                            <div
                                                className="absolute left-0 top-0.5 bottom-0.5 rounded-r transition-all duration-200"
                                                style={{
                                                    width: `${askBarWidth}%`,
                                                    backgroundColor: isAskHovered
                                                        ? 'rgba(244, 63, 94, 0.25)'
                                                        : 'rgba(244, 63, 94, 0.12)',
                                                }}
                                            />
                                            {/* Quantity label */}
                                            <span
                                                className={`relative z-10 text-[10px] font-mono pl-1 transition-colors ${
                                                    isAskHovered
                                                        ? 'text-rose-400 font-bold'
                                                        : 'text-rose-600 dark:text-rose-500/70'
                                                }`}
                                            >
                                                {formatQty(askLevel.quantity)}
                                            </span>
                                        </>
                                    )}

                                    {/* Hover tooltip */}
                                    {isAskHovered && askLevel && (
                                        <div className="absolute left-0 -top-7 z-50 bg-[#111] border border-[#333] rounded px-2 py-0.5 text-[9px] text-white whitespace-nowrap shadow-xl">
                                            Ask ${askLevel.price.toFixed(2)} — {askLevel.quantity.toLocaleString()} MT
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Best bid/ask summary bar */}
                    {bestBid != null && bestAsk != null && (
                        <div className="flex items-center justify-center gap-3 mt-1 py-1 border-t border-slate-100 dark:border-[#181818]">
                            <div className="flex items-center gap-1 text-[9px]">
                                <span className="text-slate-400 dark:text-[#555] font-bold uppercase">Best Bid</span>
                                <span className="text-emerald-500 font-bold font-mono">${bestBid.toFixed(2)}</span>
                            </div>
                            <div className="w-px h-3 bg-slate-200 dark:bg-[#333]" />
                            <div className="flex items-center gap-1 text-[9px]">
                                <span className="text-slate-400 dark:text-[#555] font-bold uppercase">Best Ask</span>
                                <span className="text-rose-500 font-bold font-mono">${bestAsk.toFixed(2)}</span>
                            </div>
                            <div className="w-px h-3 bg-slate-200 dark:bg-[#333]" />
                            <div className="flex items-center gap-1 text-[9px]">
                                <span className="text-slate-400 dark:text-[#555] font-bold uppercase">Total Bid</span>
                                <span className="text-emerald-500/70 font-mono">
                                    {formatQty(bidLevels[bidLevels.length - 1]?.cumulative ?? 0)} MT
                                </span>
                            </div>
                            <div className="w-px h-3 bg-slate-200 dark:bg-[#333]" />
                            <div className="flex items-center gap-1 text-[9px]">
                                <span className="text-slate-400 dark:text-[#555] font-bold uppercase">Total Ask</span>
                                <span className="text-rose-500/70 font-mono">
                                    {formatQty(askLevels[askLevels.length - 1]?.cumulative ?? 0)} MT
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
