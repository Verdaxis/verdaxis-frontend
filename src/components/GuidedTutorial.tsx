import React, { useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS, Step } from 'react-joyride';
import { useTutorial } from '../context/TutorialContext';
import { Page, ViewMode } from '../types';
import { useNamespace } from '../hooks/useNamespace';

interface GuidedTutorialProps {
    viewMode: ViewMode;
}

type TourPlacement = 'center' | 'right' | 'top' | 'bottom';

export interface TourStepDefinition {
    target: string;
    placement: TourPlacement;
    route?: Page;
    activateTarget?: string;
}

export const TOUR_DEFINITIONS: Record<ViewMode, TourStepDefinition[]> = {
    BUYER: [
        { target: 'body', placement: 'center' },
        { target: '[data-tour="command-center-primary-action"]', placement: 'bottom', route: 'DASHBOARD' },
        { target: '[data-tour="market-radar-panel"]', placement: 'top' },
        { target: '[data-tour="marketplace-primary-action"]', placement: 'bottom', route: 'MARKETPLACE' },
        {
            target: '[data-tour="marketplace-orderbook-surface"]',
            placement: 'top',
            activateTarget: '[data-tour="marketplace-orderbook-tab"]',
        },
        { target: '[data-tour="terminal-header"]', placement: 'right', route: 'TERMINAL' },
        { target: '[data-tour="terminal-forward-curve"]', placement: 'top' },
        { target: '[data-tour="terminal-activity-feed"]', placement: 'top' },
        { target: '[data-tour="terminal-price-alerts"]', placement: 'bottom' },
        { target: '[data-tour="nav-WATCHLISTS"]', placement: 'right', route: 'WATCHLISTS' },
        { target: '[data-tour="nav-COMPLIANCE"]', placement: 'right', route: 'COMPLIANCE' },
        { target: '[data-tour="nav-TRADES"]', placement: 'right', route: 'TRADES' },
        { target: '[data-tour="notification-bell"]', placement: 'bottom' },
    ],
    SUPPLIER: [
        { target: 'body', placement: 'center' },
        { target: '[data-tour="command-center-primary-action"]', placement: 'bottom', route: 'DASHBOARD' },
        { target: '[data-tour="market-radar-panel"]', placement: 'top' },
        { target: '[data-tour="marketplace-primary-action"]', placement: 'bottom', route: 'MARKETPLACE' },
        {
            target: '[data-tour="marketplace-orderbook-surface"]',
            placement: 'top',
            activateTarget: '[data-tour="marketplace-orderbook-tab"]',
        },
        { target: '[data-tour="terminal-header"]', placement: 'right', route: 'TERMINAL' },
        { target: '[data-tour="terminal-forward-curve"]', placement: 'top' },
        { target: '[data-tour="terminal-activity-feed"]', placement: 'top' },
        { target: '[data-tour="terminal-price-alerts"]', placement: 'bottom' },
        { target: '[data-tour="nav-WATCHLISTS"]', placement: 'right', route: 'WATCHLISTS' },
        { target: '[data-tour="nav-COMPLIANCE"]', placement: 'right', route: 'COMPLIANCE' },
        { target: '[data-tour="nav-ANALYTICS"]', placement: 'right', route: 'ANALYTICS' },
        { target: '[data-tour="nav-TRADES"]', placement: 'right', route: 'TRADES' },
        { target: '[data-tour="notification-bell"]', placement: 'bottom' },
    ],
};

const clickRouteNav = (page: Page) => {
    const el = document.querySelector(`[data-tour="nav-${page}"]`) as HTMLButtonElement | null;
    el?.click();
};

const activateTourTarget = (selector?: string) => {
    if (!selector) return;
    const el = document.querySelector(selector) as HTMLButtonElement | null;
    el?.click();
};

export const GuidedTutorial: React.FC<GuidedTutorialProps> = ({ viewMode }) => {
    const { isRunning, complete } = useTutorial();
    const { t, ready } = useNamespace('tutorial');

    const handleCallback = useCallback((data: CallBackProps) => {
        const { status, type, action, index } = data;

        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            complete();
            return;
        }

        if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT) {
            const nextStep = TOUR_DEFINITIONS[viewMode][index + 1];
            if (nextStep?.route) {
                clickRouteNav(nextStep.route);
                window.setTimeout(() => activateTourTarget(nextStep.activateTarget), 0);
            } else {
                activateTourTarget(nextStep?.activateTarget);
            }
        }
    }, [viewMode, complete]);

    if (!ready) return null;

    const prefix = viewMode === 'BUYER' ? 'buyer' : 'supplier';
    const definitions = TOUR_DEFINITIONS[viewMode];

    const steps: Step[] = definitions.map((definition, i) => ({
        target: definition.target,
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{t(`${prefix}.${i}.title`)}</h3>
                <p style={{ lineHeight: 1.6 }}>{t(`${prefix}.${i}.content`)}</p>
            </div>
        ),
        placement: definition.placement,
        disableBeacon: true,
    }));

    return (
        <Joyride
            steps={steps}
            run={isRunning}
            continuous
            showSkipButton
            showProgress
            scrollToFirstStep
            callback={handleCallback}
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
                    maxWidth: '340px',
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
