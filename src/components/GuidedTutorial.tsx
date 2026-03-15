import React, { useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, EVENTS, ACTIONS, Step } from 'react-joyride';
import { useTutorial } from '../context/TutorialContext';
import { ViewMode } from '../types';

interface GuidedTutorialProps {
    viewMode: ViewMode;
}

const BUYER_STEPS: Step[] = [
    {
        target: 'body',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Welcome to Verdaxis!</h3>
                <p style={{ lineHeight: 1.6 }}>The compliance-first marketplace for verified sustainable marine fuels. Let's take a quick tour of your Buyer Console.</p>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '[data-tour="nav-MAP"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Intelligence Map</h3>
                <p style={{ lineHeight: 1.6 }}>See real-time port availability and fuel sources across global shipping lanes. Click a port pin to browse available fuels and suppliers.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'right',
    },
    {
        target: '[data-tour="nav-MARKETPLACE"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Marketplace</h3>
                <p style={{ lineHeight: 1.6 }}>Browse and purchase verified sustainable marine fuels. Filter by fuel type, port, and price. Place bids or buy at listed prices.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'right',
    },
    {
        target: '[data-tour="nav-TERMINAL"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Market Terminal</h3>
                <p style={{ lineHeight: 1.6 }}>Live price feeds and trade data across all fuel types and global ports. Track market movements and spot pricing opportunities.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'right',
    },
    // ── Sprint 5: Data Products steps (within Market Terminal) ──
    {
        target: '[data-tour="terminal-forward-curve"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Forward Curve</h3>
                <p style={{ lineHeight: 1.6 }}>Visualise the market's view of future prices across time windows — Spot through quarterly. Bars show best bid/ask, the line tracks mid price. Auto-refreshes every 30 seconds.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'top',
    },
    {
        target: '[data-tour="terminal-activity-feed"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Market Activity Feed</h3>
                <p style={{ lineHeight: 1.6 }}>Real-time stream of market events — new listings, price crossings, and matched trades. Events relevant to your organisation are highlighted with a coloured border.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'top',
    },
    {
        target: '[data-tour="terminal-price-alerts"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Price Alerts</h3>
                <p style={{ lineHeight: 1.6 }}>Set threshold alerts on any product — get notified when prices cross above or below your target. Free tier includes 5 active alerts; upgrade for unlimited.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'bottom',
    },
    // ── End Sprint 5 steps ──
    {
        target: '[data-tour="nav-FLEET"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>My Fleet</h3>
                <p style={{ lineHeight: 1.6 }}>Manage your vessels, track compliance scores per ship, and plan upcoming refuelling schedules across all ports.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'right',
    },
    {
        target: '[data-tour="nav-COMPLIANCE"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Compliance</h3>
                <p style={{ lineHeight: 1.6 }}>Monitor your FuelEU Maritime, EU ETS, and CII obligations. Run what-if scenarios to optimise your fuel mix before purchasing.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'right',
    },
    {
        target: '[data-tour="nav-TRADES"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>My Trades</h3>
                <p style={{ lineHeight: 1.6 }}>Track all your orders and completed trades. View delivery status, confirmation timelines, and full trade history.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'right',
    },
    {
        target: '[data-tour="notification-bell"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Notifications</h3>
                <p style={{ lineHeight: 1.6 }}>Stay updated on trade confirmations, price alerts, and compliance deadlines. You're all set — start exploring!</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'bottom',
    },
];

const SUPPLIER_STEPS: Step[] = [
    {
        target: 'body',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Welcome to Verdaxis!</h3>
                <p style={{ lineHeight: 1.6 }}>The compliance-first marketplace for verified sustainable marine fuels. Let's take a quick tour of your Supplier Console.</p>
            </div>
        ),
        placement: 'center',
        disableBeacon: true,
    },
    {
        target: '[data-tour="nav-DASHBOARD"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Command Center</h3>
                <p style={{ lineHeight: 1.6 }}>Your operational hub. See outstanding orders, recent trades, inventory levels, and revenue performance at a glance.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'right',
    },
    {
        target: '[data-tour="nav-QUOTES"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Quotes & Orders</h3>
                <p style={{ lineHeight: 1.6 }}>Manage incoming purchase requests. Accept, decline, or counter-quote buyer orders from verified vessel operators worldwide.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'right',
    },
    {
        target: '[data-tour="nav-MARKETPLACE"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Marketplace</h3>
                <p style={{ lineHeight: 1.6 }}>Live intelligence on buyer demand across ports and fuel types. Spot high-demand opportunities before competitors do.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'right',
    },
    {
        target: '[data-tour="nav-TERMINAL"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Market Terminal</h3>
                <p style={{ lineHeight: 1.6 }}>Live price feeds, forward curves, and trade activity. Monitor market movements and benchmark your pricing strategy.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'right',
    },
    // ── Sprint 5: Data Products steps (within Market Terminal) ──
    {
        target: '[data-tour="terminal-forward-curve"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Forward Curve</h3>
                <p style={{ lineHeight: 1.6 }}>Visualise the market's view of future prices across time windows — Spot through quarterly. Bars show best bid/ask, the line tracks mid price. Auto-refreshes every 30 seconds.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'top',
    },
    {
        target: '[data-tour="terminal-activity-feed"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Market Activity Feed</h3>
                <p style={{ lineHeight: 1.6 }}>Real-time stream of market events — new listings, price crossings, and matched trades. Events relevant to your organisation are highlighted with a coloured border.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'top',
    },
    {
        target: '[data-tour="terminal-price-alerts"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Price Alerts</h3>
                <p style={{ lineHeight: 1.6 }}>Set threshold alerts on any product — get notified when prices cross above or below your target. Free tier includes 5 active alerts; upgrade for unlimited.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'bottom',
    },
    // ── End Sprint 5 steps ──
    {
        target: '[data-tour="nav-INVENTORY"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Inventory</h3>
                <p style={{ lineHeight: 1.6 }}>Manage your fuel stock across ports. Create listings, set prices, and track available quantities in real time.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'right',
    },
    {
        target: '[data-tour="nav-ANALYTICS"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Analytics</h3>
                <p style={{ lineHeight: 1.6 }}>Sales performance, revenue trends, and buyer behaviour insights. Understand your market position and optimise pricing strategy.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'right',
    },
    {
        target: '[data-tour="nav-TRADES"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>My Trades</h3>
                <p style={{ lineHeight: 1.6 }}>Track all completed and in-progress trades. View delivery confirmations, payment status, and full trade history.</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'right',
    },
    {
        target: '[data-tour="notification-bell"]',
        content: (
            <div>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16 }}>Notifications</h3>
                <p style={{ lineHeight: 1.6 }}>Real-time alerts for new orders, price changes, and platform updates. You're all set — start selling!</p>
            </div>
        ),
        disableBeacon: true,
        placement: 'bottom',
    },
];

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

export const GuidedTutorial: React.FC<GuidedTutorialProps> = ({ viewMode }) => {
    const { isRunning, complete } = useTutorial();

    const handleCallback = useCallback((data: CallBackProps) => {
        const { status, type, action, index } = data;

        if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
            complete();
            return;
        }

        // When the user clicks Next, navigate to the next step's page
        if (type === EVENTS.STEP_AFTER && action === ACTIONS.NEXT) {
            const navMap = viewMode === 'BUYER' ? BUYER_NAV_MAP : SUPPLIER_NAV_MAP;
            const tourId = navMap[index + 1];
            if (tourId) {
                const el = document.querySelector(`[data-tour="${tourId}"]`) as HTMLButtonElement | null;
                el?.click();
            }
        }
    }, [viewMode, complete]);

    const steps = viewMode === 'BUYER' ? BUYER_STEPS : SUPPLIER_STEPS;

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
                back: 'Back',
                close: 'Close',
                last: 'Done',
                next: 'Next \u2192',
                skip: 'Skip tour',
                open: 'Open the dialog',
            }}
        />
    );
};
