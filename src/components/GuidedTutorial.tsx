import React, { useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS, Step } from 'react-joyride';
import { useTutorial } from '../context/TutorialContext';
import { ViewMode } from '../types';
import { useNamespace } from '../hooks/useNamespace';

interface GuidedTutorialProps {
    viewMode: ViewMode;
}

// Maps step index -> data-tour ID of the nav item to click on transition
const BUYER_NAV_MAP: Record<number, string> = {
    1: 'nav-MAP',
    2: 'nav-MARKETPLACE',
    3: 'nav-TERMINAL',
    // 4-6: Forward Curve, Activity Feed, Price Alerts — in-page, no nav click
    7: 'nav-FLEET',
    8: 'nav-COMPLIANCE',
    9: 'nav-TRADES',
};

const SUPPLIER_NAV_MAP: Record<number, string> = {
    1: 'nav-DASHBOARD',
    2: 'nav-QUOTES',
    3: 'nav-MARKETPLACE',
    4: 'nav-TERMINAL',
    // 5-7: Forward Curve, Activity Feed, Price Alerts — in-page, no nav click
    8: 'nav-INVENTORY',
    9: 'nav-ANALYTICS',
    10: 'nav-TRADES',
};

const BUYER_STEP_TARGETS = [
    'body',
    '[data-tour="nav-MAP"]',
    '[data-tour="nav-MARKETPLACE"]',
    '[data-tour="nav-TERMINAL"]',
    '[data-tour="terminal-forward-curve"]',
    '[data-tour="terminal-activity-feed"]',
    '[data-tour="terminal-price-alerts"]',
    '[data-tour="nav-FLEET"]',
    '[data-tour="nav-COMPLIANCE"]',
    '[data-tour="nav-TRADES"]',
    '[data-tour="notification-bell"]',
];

const BUYER_PLACEMENTS = [
    'center', 'right', 'right', 'right', 'top', 'top', 'bottom', 'right', 'right', 'right', 'bottom',
] as const;

const SUPPLIER_STEP_TARGETS = [
    'body',
    '[data-tour="nav-DASHBOARD"]',
    '[data-tour="nav-QUOTES"]',
    '[data-tour="nav-MARKETPLACE"]',
    '[data-tour="nav-TERMINAL"]',
    '[data-tour="terminal-forward-curve"]',
    '[data-tour="terminal-activity-feed"]',
    '[data-tour="terminal-price-alerts"]',
    '[data-tour="nav-INVENTORY"]',
    '[data-tour="nav-ANALYTICS"]',
    '[data-tour="nav-TRADES"]',
    '[data-tour="notification-bell"]',
];

const SUPPLIER_PLACEMENTS = [
    'center', 'right', 'right', 'right', 'right', 'top', 'top', 'bottom', 'right', 'right', 'right', 'bottom',
] as const;

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
            const navMap = viewMode === 'BUYER' ? BUYER_NAV_MAP : SUPPLIER_NAV_MAP;
            const tourId = navMap[index + 1];
            if (tourId) {
                const el = document.querySelector(`[data-tour="${tourId}"]`) as HTMLButtonElement | null;
                el?.click();
            }
        }
    }, [viewMode, complete]);

    if (!ready) return null;

    const prefix = viewMode === 'BUYER' ? 'buyer' : 'supplier';
    const targets = viewMode === 'BUYER' ? BUYER_STEP_TARGETS : SUPPLIER_STEP_TARGETS;
    const placements = viewMode === 'BUYER' ? BUYER_PLACEMENTS : SUPPLIER_PLACEMENTS;

    const steps: Step[] = targets.map((target, i) => ({
        target,
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>{t(`${prefix}.${i}.title`)}</h3>
                <p style={{ lineHeight: 1.6 }}>{t(`${prefix}.${i}.content`)}</p>
            </div>
        ),
        placement: placements[i],
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
