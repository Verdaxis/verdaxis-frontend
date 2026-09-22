import {
    ArrowLeftRight,
    BarChart3,
    Handshake,
    LayoutDashboard,
    LineChart,
    Map as MapIcon,
    Star,
    type LucideIcon,
} from 'lucide-react';
import type { TFunction } from 'i18next';

import { PAGE_SLUGS, type Page } from '../../types';

export interface SidebarNavItem {
    key: string;
    page: Page;
    path: string;
    label: string;
    icon: LucideIcon;
}

interface SidebarNavBlueprint {
    key: string;
    icon: LucideIcon;
    labelKey: string;
    page: Page;
}

const PRIMARY_SIDEBAR_BLUEPRINTS: SidebarNavBlueprint[] = [
    { key: 'DASHBOARD', page: 'DASHBOARD', labelKey: 'sidebar.commandCenter', icon: LayoutDashboard },
    { key: 'MAP', page: 'MAP', labelKey: 'sidebar.intelligenceMap', icon: MapIcon },
    { key: 'MARKETPLACE', page: 'MARKETPLACE', labelKey: 'sidebar.marketplace', icon: Handshake },
    { key: 'FORWARD_CURVE', page: 'FORWARD_CURVE', labelKey: 'sidebar.forwardCurve', icon: LineChart },
    { key: 'WATCHLISTS', page: 'WATCHLISTS', labelKey: 'sidebar.watchlists', icon: Star },
    {
        key: 'ANALYTICS',
        page: 'DATA_ANALYTICS',
        labelKey: 'sidebar.analytics',
        icon: BarChart3,
    },
    { key: 'TRADES', page: 'TRADES', labelKey: 'sidebar.tradeHistory', icon: ArrowLeftRight },
];

export function buildPrimarySidebarItems(t: TFunction): SidebarNavItem[] {
    return PRIMARY_SIDEBAR_BLUEPRINTS.map((item) => {
        return {
            key: item.key,
            page: item.page,
            path: `/app/${PAGE_SLUGS[item.page]}`,
            label: t(item.labelKey),
            icon: item.icon,
        };
    });
}
