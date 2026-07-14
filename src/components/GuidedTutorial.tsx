import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Joyride, { ACTIONS, CallBackProps, EVENTS, STATUS, Step, TooltipRenderProps } from 'react-joyride';
import { useTutorial } from '../context/TutorialContext';
import { ViewMode } from '../types';
import { useNamespace } from '../hooks/useNamespace';
import { useAuth } from '../context/AuthContext';
import { analytics, type AnalyticsRole } from '../services/analytics';

interface GuidedTutorialProps {
    viewMode: ViewMode;
}

type TutorialStepMode = 'info' | 'click';

export interface TutorialStepDefinition {
    target: string;
    titleKey: string;
    contentKey: string;
    placement: Step['placement'];
    mode?: TutorialStepMode;
    advanceOnSelector?: string;
    waitForSelector?: string;
    requiredSelector?: string;
    fallbackClickSelector?: string;
    missingTargetFallbackOffset?: number;
}

const CLICK_ADVANCE_DELAY_MS = 180;
const WAIT_FOR_TARGET_TIMEOUT_MS = 1800;
const TUTORIAL_SAMPLE_PRODUCT = 'BIO_METHANOL';
const TUTORIAL_SAMPLE_PORT = 'Singapore';
const TUTORIAL_SAMPLE_WINDOW = 'SPOT';
const TUTORIAL_SAMPLE_PRODUCT_SELECTOR = `[data-tour-market-product="${TUTORIAL_SAMPLE_PRODUCT}"]`;
const TUTORIAL_SAMPLE_PRODUCT_PORT_SELECTOR = `[data-tour-market-product="${TUTORIAL_SAMPLE_PRODUCT}"][data-tour-port="${TUTORIAL_SAMPLE_PORT}"]`;
const TUTORIAL_SAMPLE_SLICE_SELECTOR = `[data-tour-market-product="${TUTORIAL_SAMPLE_PRODUCT}"][data-tour-port="${TUTORIAL_SAMPLE_PORT}"][data-tour-window="${TUTORIAL_SAMPLE_WINDOW}"]`;
const TOOLTIP_VIEWPORT_PADDING = 16;
const TOOLTIP_TARGET_GAP = 14;
const TOOLTIP_MAX_WIDTH = 360;
const TOOLTIP_INFO_HEIGHT = 235;
const TOOLTIP_CLICK_HEIGHT = 305;

const buyerSteps: TutorialStepDefinition[] = [
    { target: 'body', titleKey: 'buyer.0.title', contentKey: 'buyer.0.content', placement: 'center' },
    { target: '[data-tour="nav-MAP"]', titleKey: 'buyer.1.title', contentKey: 'buyer.1.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="nav-MAP"]' },
    { target: '[data-tour="nav-MARKETPLACE"]', titleKey: 'buyer.2.title', contentKey: 'buyer.2.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="nav-MARKETPLACE"]', waitForSelector: '[data-tour="marketplace-primary-action"]' },
    { target: '[data-tour="marketplace-product-sample"]', titleKey: 'buyer.3.title', contentKey: 'buyer.3.content', placement: 'bottom', mode: 'click', advanceOnSelector: '[data-tour="marketplace-product-sample"]', requiredSelector: TUTORIAL_SAMPLE_PRODUCT_SELECTOR },
    { target: '[data-tour="marketplace-filter-toggle"]', titleKey: 'buyer.4.title', contentKey: 'buyer.4.content', placement: 'left', mode: 'click', advanceOnSelector: '[data-tour="marketplace-filter-toggle"]', requiredSelector: '[data-tour="marketplace-advanced-filters"]' },
    { target: '[data-tour="marketplace-port-select"]', titleKey: 'buyer.slicePort.title', contentKey: 'buyer.slicePort.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="marketplace-port-option-singapore"]', requiredSelector: TUTORIAL_SAMPLE_PRODUCT_PORT_SELECTOR, fallbackClickSelector: '[data-tour="marketplace-port-select"]' },
    { target: '[data-tour="marketplace-window-select"]', titleKey: 'buyer.sliceWindow.title', contentKey: 'buyer.sliceWindow.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="marketplace-window-option-spot"]', requiredSelector: TUTORIAL_SAMPLE_SLICE_SELECTOR, fallbackClickSelector: '[data-tour="marketplace-window-select"]' },
    { target: '[data-tour="marketplace-tab-orderbook"]', titleKey: 'buyer.5.title', contentKey: 'buyer.5.content', placement: 'bottom', mode: 'click', advanceOnSelector: '[data-tour="marketplace-tab-orderbook"]', requiredSelector: `${TUTORIAL_SAMPLE_SLICE_SELECTOR}[data-tour-tab="orderbook"]` },
    { target: '[data-tour="marketplace-market-scope"]', titleKey: 'buyer.6.title', contentKey: 'buyer.6.content', placement: 'top' },
    { target: '[data-tour="marketplace-orderbook-panel"]', titleKey: 'buyer.7.title', contentKey: 'buyer.7.content', placement: 'left', mode: 'click', advanceOnSelector: '[data-tour="orderbook-actionable-level"]', waitForSelector: '[data-tour="trade-modal"]', missingTargetFallbackOffset: 5 },
    { target: '[data-tour="trade-modal"]', titleKey: 'buyer.8.title', contentKey: 'buyer.8.content', placement: 'left' },
    { target: '[data-tour="trade-review-button"]', titleKey: 'buyer.9.title', contentKey: 'buyer.9.content', placement: 'top', mode: 'click', advanceOnSelector: '[data-tour="trade-review-button"]', waitForSelector: '[data-tour="trade-final-confirm-button"]' },
    { target: '[data-tour="trade-final-confirm-button"]', titleKey: 'buyer.10.title', contentKey: 'buyer.10.content', placement: 'top' },
    { target: '[data-tour="trade-modal-close"]', titleKey: 'buyer.11.title', contentKey: 'buyer.11.content', placement: 'bottom', mode: 'click', advanceOnSelector: '[data-tour="trade-modal-close"]', waitForSelector: '[data-tour="marketplace-primary-action"]' },
    { target: '[data-tour="marketplace-primary-action"]', titleKey: 'buyer.12.title', contentKey: 'buyer.12.content', placement: 'left', mode: 'click', advanceOnSelector: '[data-tour="marketplace-primary-action"]', waitForSelector: '[data-tour="order-modal"]' },
    { target: '[data-tour="order-modal-core-fields"]', titleKey: 'buyer.13.title', contentKey: 'buyer.13.content', placement: 'left' },
    { target: '[data-tour="order-modal-advanced-toggle"]', titleKey: 'buyer.14.title', contentKey: 'buyer.14.content', placement: 'top', mode: 'click', advanceOnSelector: '[data-tour="order-modal-advanced-toggle"]', waitForSelector: '[data-tour="order-modal-advanced-fields"]' },
    { target: '[data-tour="order-modal-submit-boundary"]', titleKey: 'buyer.15.title', contentKey: 'buyer.15.content', placement: 'left' },
    { target: '[data-tour="order-modal-close"]', titleKey: 'buyer.16.title', contentKey: 'buyer.16.content', placement: 'left', mode: 'click', advanceOnSelector: '[data-tour="order-modal-close"]', waitForSelector: '[data-tour="nav-FORWARD_CURVE"]' },
    { target: '[data-tour="nav-FORWARD_CURVE"]', titleKey: 'buyer.17.title', contentKey: 'buyer.17.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="nav-FORWARD_CURVE"]', waitForSelector: '[data-tour="forward-curve-chart"]' },
    { target: '[data-tour="forward-curve-chart"]', titleKey: 'buyer.18.title', contentKey: 'buyer.18.content', placement: 'bottom' },
    { target: '[data-tour="forward-market-matrix-header"]', titleKey: 'buyer.19.title', contentKey: 'buyer.19.content', placement: 'bottom-start' },
    { target: '[data-tour="forward-latest-signals"]', titleKey: 'buyer.20.title', contentKey: 'buyer.20.content', placement: 'bottom' },
    { target: '[data-tour="forward-open-marketplace"]', titleKey: 'buyer.21.title', contentKey: 'buyer.21.content', placement: 'bottom', mode: 'click', advanceOnSelector: '[data-tour="forward-open-marketplace"]', waitForSelector: '[data-tour="marketplace-primary-action"]' },
    { target: '[data-tour="nav-WATCHLISTS"]', titleKey: 'buyer.22.title', contentKey: 'buyer.22.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="nav-WATCHLISTS"]' },
    { target: '[data-tour="nav-ANALYTICS"]', titleKey: 'buyer.23.title', contentKey: 'buyer.23.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="nav-ANALYTICS"]' },
    { target: '[data-tour="nav-TRADES"]', titleKey: 'buyer.24.title', contentKey: 'buyer.24.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="nav-TRADES"]' },
    { target: '[data-tour="notification-bell"]', titleKey: 'buyer.25.title', contentKey: 'buyer.25.content', placement: 'bottom' },
];

const supplierSteps: TutorialStepDefinition[] = [
    { target: 'body', titleKey: 'supplier.0.title', contentKey: 'supplier.0.content', placement: 'center' },
    { target: '[data-tour="nav-MAP"]', titleKey: 'supplier.1.title', contentKey: 'supplier.1.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="nav-MAP"]' },
    { target: '[data-tour="nav-MARKETPLACE"]', titleKey: 'supplier.2.title', contentKey: 'supplier.2.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="nav-MARKETPLACE"]', waitForSelector: '[data-tour="marketplace-primary-action"]' },
    { target: '[data-tour="marketplace-product-sample"]', titleKey: 'supplier.3.title', contentKey: 'supplier.3.content', placement: 'bottom', mode: 'click', advanceOnSelector: '[data-tour="marketplace-product-sample"]', requiredSelector: TUTORIAL_SAMPLE_PRODUCT_SELECTOR },
    { target: '[data-tour="marketplace-filter-toggle"]', titleKey: 'supplier.4.title', contentKey: 'supplier.4.content', placement: 'left', mode: 'click', advanceOnSelector: '[data-tour="marketplace-filter-toggle"]', requiredSelector: '[data-tour="marketplace-advanced-filters"]' },
    { target: '[data-tour="marketplace-port-select"]', titleKey: 'supplier.slicePort.title', contentKey: 'supplier.slicePort.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="marketplace-port-option-singapore"]', requiredSelector: TUTORIAL_SAMPLE_PRODUCT_PORT_SELECTOR, fallbackClickSelector: '[data-tour="marketplace-port-select"]' },
    { target: '[data-tour="marketplace-window-select"]', titleKey: 'supplier.sliceWindow.title', contentKey: 'supplier.sliceWindow.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="marketplace-window-option-spot"]', requiredSelector: TUTORIAL_SAMPLE_SLICE_SELECTOR, fallbackClickSelector: '[data-tour="marketplace-window-select"]' },
    { target: '[data-tour="marketplace-tab-orderbook"]', titleKey: 'supplier.5.title', contentKey: 'supplier.5.content', placement: 'bottom', mode: 'click', advanceOnSelector: '[data-tour="marketplace-tab-orderbook"]', requiredSelector: `${TUTORIAL_SAMPLE_SLICE_SELECTOR}[data-tour-tab="orderbook"]` },
    { target: '[data-tour="marketplace-market-scope"]', titleKey: 'supplier.6.title', contentKey: 'supplier.6.content', placement: 'top' },
    { target: '[data-tour="marketplace-orderbook-panel"]', titleKey: 'supplier.7.title', contentKey: 'supplier.7.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="orderbook-actionable-level"]', waitForSelector: '[data-tour="trade-modal"]', missingTargetFallbackOffset: 5 },
    { target: '[data-tour="trade-modal"]', titleKey: 'supplier.8.title', contentKey: 'supplier.8.content', placement: 'left' },
    { target: '[data-tour="trade-review-button"]', titleKey: 'supplier.9.title', contentKey: 'supplier.9.content', placement: 'top', mode: 'click', advanceOnSelector: '[data-tour="trade-review-button"]', waitForSelector: '[data-tour="trade-final-confirm-button"]' },
    { target: '[data-tour="trade-final-confirm-button"]', titleKey: 'supplier.10.title', contentKey: 'supplier.10.content', placement: 'top' },
    { target: '[data-tour="trade-modal-close"]', titleKey: 'supplier.11.title', contentKey: 'supplier.11.content', placement: 'bottom', mode: 'click', advanceOnSelector: '[data-tour="trade-modal-close"]', waitForSelector: '[data-tour="marketplace-primary-action"]' },
    { target: '[data-tour="marketplace-primary-action"]', titleKey: 'supplier.12.title', contentKey: 'supplier.12.content', placement: 'left', mode: 'click', advanceOnSelector: '[data-tour="marketplace-primary-action"]', waitForSelector: '[data-tour="order-modal"]' },
    { target: '[data-tour="order-modal-core-fields"]', titleKey: 'supplier.13.title', contentKey: 'supplier.13.content', placement: 'left' },
    { target: '[data-tour="order-modal-advanced-fields"]', titleKey: 'supplier.14.title', contentKey: 'supplier.14.content', placement: 'left' },
    { target: '[data-tour="order-modal-supplier-fields"]', titleKey: 'supplier.15.title', contentKey: 'supplier.15.content', placement: 'left' },
    { target: '[data-tour="order-modal-submit-boundary"]', titleKey: 'supplier.16.title', contentKey: 'supplier.16.content', placement: 'left' },
    { target: '[data-tour="order-modal-close"]', titleKey: 'supplier.17.title', contentKey: 'supplier.17.content', placement: 'left', mode: 'click', advanceOnSelector: '[data-tour="order-modal-close"]', waitForSelector: '[data-tour="nav-FORWARD_CURVE"]' },
    { target: '[data-tour="nav-FORWARD_CURVE"]', titleKey: 'supplier.18.title', contentKey: 'supplier.18.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="nav-FORWARD_CURVE"]', waitForSelector: '[data-tour="forward-curve-chart"]' },
    { target: '[data-tour="forward-curve-chart"]', titleKey: 'supplier.19.title', contentKey: 'supplier.19.content', placement: 'bottom' },
    { target: '[data-tour="forward-market-matrix-header"]', titleKey: 'supplier.20.title', contentKey: 'supplier.20.content', placement: 'bottom-start' },
    { target: '[data-tour="forward-latest-signals"]', titleKey: 'supplier.21.title', contentKey: 'supplier.21.content', placement: 'bottom' },
    { target: '[data-tour="forward-open-marketplace"]', titleKey: 'supplier.22.title', contentKey: 'supplier.22.content', placement: 'bottom', mode: 'click', advanceOnSelector: '[data-tour="forward-open-marketplace"]', waitForSelector: '[data-tour="marketplace-primary-action"]' },
    { target: '[data-tour="nav-WATCHLISTS"]', titleKey: 'supplier.23.title', contentKey: 'supplier.23.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="nav-WATCHLISTS"]' },
    { target: '[data-tour="nav-ANALYTICS"]', titleKey: 'supplier.24.title', contentKey: 'supplier.24.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="nav-ANALYTICS"]' },
    { target: '[data-tour="nav-TRADES"]', titleKey: 'supplier.25.title', contentKey: 'supplier.25.content', placement: 'right', mode: 'click', advanceOnSelector: '[data-tour="nav-TRADES"]' },
    { target: '[data-tour="notification-bell"]', titleKey: 'supplier.26.title', contentKey: 'supplier.26.content', placement: 'bottom' },
];

export function getGuidedTutorialStepDefinitions(viewMode: ViewMode): TutorialStepDefinition[] {
    return viewMode === 'BUYER' ? buyerSteps : supplierSteps;
}

function findTarget(selector: string): Element | null {
    try {
        return document.querySelector(selector);
    } catch {
        return null;
    }
}

function waitForTarget(selector: string, onReady: () => void, onTimeout?: () => void) {
    const startedAt = Date.now();
    const tick = () => {
        if (findTarget(selector)) {
            onReady();
            return;
        }
        if (Date.now() - startedAt >= WAIT_FOR_TARGET_TIMEOUT_MS) {
            onTimeout?.();
            return;
        }
        window.setTimeout(tick, 80);
    };
    tick();
}

function getScrollableAncestor(element: HTMLElement): HTMLElement | null {
    let parent = element.parentElement;
    while (parent) {
        const style = window.getComputedStyle(parent);
        const canScroll = /(auto|scroll)/.test(style.overflowY) && parent.scrollHeight > parent.clientHeight;
        if (canScroll) return parent;
        parent = parent.parentElement;
    }
    return null;
}

function scrollTargetIntoView(selector: string) {
    const target = findTarget(selector);
    if (!(target instanceof HTMLElement)) return;

    const viewportPadding = 24;
    const scrollParent = getScrollableAncestor(target);
    if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const targetInsideParent =
            targetRect.top >= parentRect.top + viewportPadding &&
            targetRect.bottom <= parentRect.bottom - viewportPadding;
        if (!targetInsideParent) {
            const centeredOffset = targetRect.top - parentRect.top - ((parentRect.height - targetRect.height) / 2);
            scrollParent.scrollTop += centeredOffset;
        }
    }

    const targetRect = target.getBoundingClientRect();
    const targetInsideViewport =
        targetRect.top >= viewportPadding &&
        targetRect.bottom <= window.innerHeight - viewportPadding;
    if (!targetInsideViewport) {
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    }
}

export function getBasePlacement(placement: Step['placement']): string {
    return String(placement || '').split('-')[0];
}

export function uniquePlacements(placements: Step['placement'][]): Step['placement'][] {
    return placements.filter((placement, index) => placements.indexOf(placement) === index);
}

export function getPlacementCandidates(preferred: Step['placement']): Step['placement'][] {
    const base = getBasePlacement(preferred);
    if (base === 'center' || base === 'auto') return [preferred];

    if (base === 'left') return uniquePlacements([preferred, 'right', 'bottom', 'top', 'center']);
    if (base === 'right') return uniquePlacements([preferred, 'left', 'bottom', 'top', 'center']);
    if (base === 'top') return uniquePlacements([preferred, 'bottom', 'right', 'left', 'center']);
    if (base === 'bottom') {
        const opposite = String(preferred).includes('-start') ? 'top-start' : String(preferred).includes('-end') ? 'top-end' : 'top';
        return uniquePlacements([preferred, opposite as Step['placement'], 'right', 'left', 'center']);
    }

    return uniquePlacements([preferred, 'bottom', 'top', 'right', 'left', 'center']);
}

export function placementFitsViewport(placement: Step['placement'], targetRect: DOMRect, mode?: TutorialStepMode): boolean {
    const base = getBasePlacement(placement);
    if (base === 'center' || base === 'auto') return true;

    const tooltipWidth = Math.min(TOOLTIP_MAX_WIDTH, window.innerWidth - (TOOLTIP_VIEWPORT_PADDING * 2));
    const tooltipHeight = mode === 'click' ? TOOLTIP_CLICK_HEIGHT : TOOLTIP_INFO_HEIGHT;
    const requiredHorizontal = tooltipWidth + TOOLTIP_TARGET_GAP + TOOLTIP_VIEWPORT_PADDING;
    const requiredVertical = tooltipHeight + TOOLTIP_TARGET_GAP + TOOLTIP_VIEWPORT_PADDING;

    if (base === 'left') return targetRect.left >= requiredHorizontal;
    if (base === 'right') return window.innerWidth - targetRect.right >= requiredHorizontal;
    if (base === 'top') return targetRect.top >= requiredVertical;
    if (base === 'bottom') return window.innerHeight - targetRect.bottom >= requiredVertical;
    return true;
}

export function resolveViewportAwarePlacement(definition: TutorialStepDefinition): Step['placement'] {
    if (definition.target === 'body' || definition.placement === 'center') return definition.placement;
    if (typeof window === 'undefined') return definition.placement;

    const target = findTarget(definition.target);
    if (!(target instanceof HTMLElement)) return definition.placement;

    const targetRect = target.getBoundingClientRect();
    const candidates = getPlacementCandidates(definition.placement);
    return candidates.find(candidate => placementFitsViewport(candidate, targetRect, definition.mode)) || 'center';
}

type TutorialSurface = 'order-modal' | 'trade-modal' | 'page';

function getTutorialSurface(definition?: TutorialStepDefinition): TutorialSurface {
    const selector = `${definition?.target || ''} ${definition?.advanceOnSelector || ''}`;
    if (selector.includes('order-modal')) return 'order-modal';
    if (selector.includes('trade-modal')) return 'trade-modal';
    return 'page';
}

function clickIfPresent(selector: string): boolean {
    const target = findTarget(selector);
    if (target instanceof HTMLElement) {
        target.click();
        return true;
    }
    if (target) {
        target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        return true;
    }
    return false;
}

interface TooltipData {
    mode?: TutorialStepMode;
    clickHint?: string;
    skipStepLabel?: string;
    onSkipStep?: () => void;
}

const GuidedTooltip: React.FC<TooltipRenderProps> = ({
    backProps,
    index,
    isLastStep,
    primaryProps,
    skipProps,
    step,
    tooltipProps,
}) => {
    const styles = step.styles;
    const data = step.data as TooltipData | undefined;
    const clickStep = data?.mode === 'click';

    return (
        <div
            aria-label={typeof step.title === 'string' ? step.title : undefined}
            className="react-joyride__tooltip"
            style={styles.tooltip}
            {...tooltipProps}
        >
            <div style={styles.tooltipContainer}>
                {step.title && (
                    <h1 style={styles.tooltipTitle}>{step.title}</h1>
                )}
                <div style={styles.tooltipContent}>{step.content}</div>
                {clickStep && data?.clickHint && (
                    <div
                        style={{
                            marginTop: 14,
                            borderRadius: 8,
                            border: '1px solid rgba(93, 173, 226, 0.28)',
                            background: 'rgba(93, 173, 226, 0.10)',
                            color: '#bfdbfe',
                            fontSize: 12,
                            fontWeight: 600,
                            lineHeight: 1.45,
                            padding: '9px 10px',
                        }}
                    >
                        {data.clickHint}
                    </div>
                )}
            </div>
            <div style={styles.tooltipFooter}>
                <div style={styles.tooltipFooterSpacer}>
                    {!isLastStep && (
                        <button
                            aria-live="off"
                            data-test-id="button-skip"
                            style={styles.buttonSkip}
                            type="button"
                            {...skipProps}
                        />
                    )}
                </div>
                {index > 0 && (
                    <button data-test-id="button-back" style={styles.buttonBack} type="button" {...backProps} />
                )}
                {clickStep ? (
                    <button
                        data-test-id="button-primary"
                        style={styles.buttonNext}
                        type="button"
                        onClick={data?.onSkipStep}
                    >
                        {data?.skipStepLabel}
                    </button>
                ) : (
                    <button
                        data-test-id="button-primary"
                        style={styles.buttonNext}
                        type="button"
                        {...primaryProps}
                    />
                )}
            </div>
        </div>
    );
};

export const GuidedTutorial: React.FC<GuidedTutorialProps> = ({ viewMode }) => {
    const { isRunning, complete } = useTutorial();
    const { user } = useAuth();
    const { t, ready } = useNamespace('tutorial');
    const [stepIndex, setStepIndex] = useState(0);
    const [placementRefreshKey, setPlacementRefreshKey] = useState(0);
    const navigationDirection = useRef<'forward' | 'backward'>('forward');
    const wasRunning = useRef(false);
    const completedTracked = useRef(false);
    const skippedStep = useRef<number | null>(null);
    const analyticsRole = (user?.role ?? viewMode) as AnalyticsRole;

    const definitions = useMemo(() => getGuidedTutorialStepDefinitions(viewMode), [viewMode]);
    const activeDefinition = definitions[stepIndex];

    useEffect(() => {
        if (isRunning && !wasRunning.current) {
            completedTracked.current = false;
            analytics.track('tutorial_started', { role: analyticsRole });
        }
        wasRunning.current = isRunning;
        if (!isRunning) {
            setStepIndex(0);
        }
    }, [analyticsRole, isRunning]);

    useEffect(() => {
        if (!isRunning || !activeDefinition) return;

        scrollTargetIntoView(activeDefinition.target);
        setPlacementRefreshKey(key => key + 1);
        const timer = window.setTimeout(() => {
            scrollTargetIntoView(activeDefinition.target);
            setPlacementRefreshKey(key => key + 1);
        }, CLICK_ADVANCE_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [activeDefinition, isRunning]);

    useEffect(() => {
        if (!isRunning) return;

        let frame = 0;
        const refreshPlacement = () => {
            window.cancelAnimationFrame(frame);
            frame = window.requestAnimationFrame(() => setPlacementRefreshKey(key => key + 1));
        };

        window.addEventListener('resize', refreshPlacement);
        window.addEventListener('scroll', refreshPlacement, true);
        return () => {
            window.cancelAnimationFrame(frame);
            window.removeEventListener('resize', refreshPlacement);
            window.removeEventListener('scroll', refreshPlacement, true);
        };
    }, [isRunning]);

    const advanceTo = useCallback((nextIndex: number) => {
        if (nextIndex >= definitions.length) {
            if (!completedTracked.current) {
                completedTracked.current = true;
                analytics.track('tutorial_completed', { role: analyticsRole });
            }
            complete();
            setStepIndex(0);
            return;
        }
        setStepIndex(Math.max(0, nextIndex));
    }, [analyticsRole, complete, definitions.length]);

    const advanceAfterOptionalWait = useCallback((definition: TutorialStepDefinition, nextIndex: number) => {
        const finish = () => advanceTo(nextIndex);
        const selector = definition.requiredSelector || definition.waitForSelector;
        if (selector) {
            waitForTarget(selector, finish, definition.requiredSelector ? undefined : finish);
            return;
        }
        window.setTimeout(finish, CLICK_ADVANCE_DELAY_MS);
    }, [advanceTo]);

    const closeModalBeforeBackIfNeeded = useCallback((currentIndex: number, previousIndex: number) => {
        const currentSurface = getTutorialSurface(definitions[currentIndex]);
        const previousSurface = getTutorialSurface(definitions[previousIndex]);

        if (previousSurface !== 'order-modal' && currentSurface !== 'order-modal' && findTarget('[data-tour="order-modal"]')) {
            clickIfPresent('[data-tour="order-modal-close"]');
            return true;
        }

        if (previousSurface !== 'order-modal' && currentSurface === 'order-modal') {
            return clickIfPresent('[data-tour="order-modal-close"]');
        }

        if (previousSurface !== 'trade-modal' && currentSurface !== 'trade-modal' && findTarget('[data-tour="trade-modal"]')) {
            clickIfPresent('[data-tour="trade-modal-close"]');
            return true;
        }

        if (previousSurface !== 'trade-modal' && currentSurface === 'trade-modal') {
            return clickIfPresent('[data-tour="trade-modal-close"]');
        }

        return false;
    }, [definitions]);

    const clickActiveTarget = useCallback((definition: TutorialStepDefinition, index: number) => {
        navigationDirection.current = 'forward';
        if (definition.requiredSelector && findTarget(definition.requiredSelector)) {
            advanceTo(index + 1);
            return;
        }
        const selector = definition.advanceOnSelector || definition.target;
        const target = findTarget(selector);

        if (target instanceof HTMLElement) {
            target.click();
            return;
        }

        if (target) {
            target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            return;
        }

        if (definition.fallbackClickSelector && clickIfPresent(definition.fallbackClickSelector)) {
            waitForTarget(selector, () => clickIfPresent(selector));
            return;
        }

        if (definition.missingTargetFallbackOffset) {
            advanceTo(index + definition.missingTargetFallbackOffset);
            return;
        }

        if (!definition.requiredSelector && !definition.waitForSelector) {
            advanceAfterOptionalWait(definition, index + 1);
        }
    }, [advanceAfterOptionalWait, advanceTo]);

    useEffect(() => {
        if (!isRunning || !activeDefinition || activeDefinition.mode !== 'click') return;

        const selector = activeDefinition.advanceOnSelector || activeDefinition.target;
        const handleClick = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (!target.closest(selector)) return;

            navigationDirection.current = 'forward';
            if (skippedStep.current === stepIndex) {
                skippedStep.current = null;
            } else {
                analytics.track('tutorial_step_completed', { step: `${viewMode.toLowerCase()}_${stepIndex + 1}`, role: analyticsRole });
            }
            window.setTimeout(() => {
                advanceAfterOptionalWait(activeDefinition, stepIndex + 1);
            }, CLICK_ADVANCE_DELAY_MS);
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [activeDefinition, advanceAfterOptionalWait, analyticsRole, isRunning, stepIndex, viewMode]);

    const handleCallback = useCallback((data: CallBackProps) => {
        const { action, index, status, type } = data;

        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            if (!completedTracked.current) {
                completedTracked.current = true;
                analytics.track('tutorial_completed', { role: analyticsRole });
            }
            complete();
            setStepIndex(0);
            return;
        }

        if (type === EVENTS.TARGET_NOT_FOUND) {
            if (navigationDirection.current === 'forward' && definitions[index]?.requiredSelector) {
                advanceTo(Math.max(0, index - 1));
                return;
            }
            advanceTo(navigationDirection.current === 'backward' ? index - 1 : index + 1);
            return;
        }

        if (type !== EVENTS.STEP_AFTER) return;

        if (action === ACTIONS.PREV) {
            navigationDirection.current = 'backward';
            const previousIndex = Math.max(0, index - 1);
            const closedModal = closeModalBeforeBackIfNeeded(index, previousIndex);
            if (closedModal) {
                window.setTimeout(() => advanceTo(previousIndex), CLICK_ADVANCE_DELAY_MS);
                return;
            }
            advanceTo(previousIndex);
            return;
        }

        if (action === ACTIONS.NEXT || action === ACTIONS.CLOSE) {
            navigationDirection.current = 'forward';
            analytics.track('tutorial_step_completed', { step: `${viewMode.toLowerCase()}_${index + 1}`, role: analyticsRole });
            advanceTo(index + 1);
        }
    }, [advanceTo, analyticsRole, closeModalBeforeBackIfNeeded, complete, viewMode]);

    if (!ready) return null;

    const steps: Step[] = definitions.map((definition, index) => {
        const clickStep = definition.mode === 'click';
        const placement = index === stepIndex ? resolveViewportAwarePlacement(definition) : definition.placement;
        return {
            target: definition.target,
            content: (
                <div>
                    <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{t(definition.titleKey)}</h3>
                    <p style={{ lineHeight: 1.6 }}>{t(definition.contentKey)}</p>
                </div>
            ),
            placement,
            data: {
                mode: definition.mode,
                clickHint: clickStep ? t('locale.clickTargetToContinue') : undefined,
                skipStepLabel: clickStep ? t('locale.skipStep') : undefined,
                onSkipStep: clickStep ? () => {
                    skippedStep.current = index;
                    analytics.track('tutorial_step_skipped', { step: `${viewMode.toLowerCase()}_${index + 1}`, role: analyticsRole });
                    clickActiveTarget(definition, index);
                    window.setTimeout(() => {
                        if (skippedStep.current === index) skippedStep.current = null;
                    }, 0);
                } : undefined,
            },
            disableBeacon: true,
            disableOverlayClose: true,
            hideFooter: false,
            hideCloseButton: true,
            spotlightClicks: clickStep,
        };
    });

    return (
        <Joyride
            steps={steps}
            run={isRunning}
            stepIndex={stepIndex}
            continuous
            showSkipButton
            showProgress
            disableScrollParentFix
            disableScrolling
            callback={handleCallback}
            tooltipComponent={GuidedTooltip}
            styles={{
                options: {
                    primaryColor: '#0066FF',
                    backgroundColor: '#1e293b',
                    textColor: '#e2e8f0',
                    arrowColor: '#1e293b',
                    overlayColor: 'rgba(0, 0, 0, 0.55)',
                    zIndex: 10000,
                },
                tooltipContainer: {
                    textAlign: 'left',
                },
                tooltip: {
                    borderRadius: '10px',
                    padding: '20px',
                    maxWidth: '360px',
                    width: 'min(360px, calc(100vw - 32px))',
                    boxSizing: 'border-box',
                },
                buttonNext: {
                    backgroundColor: '#0066FF',
                    color: '#ffffff',
                    borderRadius: '6px',
                    padding: '8px 20px',
                    fontSize: '14px',
                    fontWeight: 600,
                    border: 'none',
                },
                buttonBack: {
                    color: '#94a3b8',
                    fontSize: '14px',
                    marginRight: 8,
                },
                buttonSkip: {
                    color: '#64748b',
                    fontSize: '13px',
                },
                buttonClose: {
                    color: '#64748b',
                },
            }}
            locale={{
                back: t('locale.back'),
                close: t('locale.close'),
                last: t('locale.last'),
                next: t('locale.next'),
                skip: t('locale.skip'),
                open: t('locale.open'),
            }}
        />
    );
};
