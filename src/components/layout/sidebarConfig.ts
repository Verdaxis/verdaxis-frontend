import {
    ArrowLeftRight,
    BarChart3,
    LayoutDashboard,
    LineChart,
    Map as MapIcon,
    ShoppingCart,
    Star,
    type LucideIcon,
} from 'lucide-react';
import type { TFunction } from 'i18next';

import type { Page, ViewMode } from '../../types';

export interface SidebarNavItem {
    key: string;
    page: Page;
    label: string;
    icon: LucideIcon;
}

interface SidebarNavBlueprint {
    key: string;
    icon: LucideIcon;
    labelKey: string;
    page: Page | ((viewMode: ViewMode) => Page);
}

const PRIMARY_SIDEBAR_BLUEPRINTS: SidebarNavBlueprint[] = [
    { key: 'DASHBOARD', page: 'DASHBOARD', labelKey: 'sidebar.commandCenter', icon: LayoutDashboard },
    { key: 'MAP', page: 'MAP', labelKey: 'sidebar.intelligenceMap', icon: MapIcon },
    { key: 'MARKETPLACE', page: 'MARKETPLACE', labelKey: 'sidebar.marketplace', icon: ShoppingCart },
    { key: 'FORWARD_CURVE', page: 'FORWARD_CURVE', labelKey: 'sidebar.marketTerminal', icon: LineChart },
    { key: 'WATCHLISTS', page: 'WATCHLISTS', labelKey: 'sidebar.watchlists', icon: Star },
    {
        key: 'ANALYTICS',
        page: (viewMode: ViewMode) => (viewMode === 'BUYER' ? 'DATA_ANALYTICS' : 'ANALYTICS'),
        labelKey: 'sidebar.analytics',
        icon: BarChart3,
    },
    { key: 'TRADES', page: 'TRADES', labelKey: 'sidebar.tradeHistory', icon: ArrowLeftRight },
];

export function buildPrimarySidebarItems(t: TFunction, viewMode: ViewMode): SidebarNavItem[] {
    return PRIMARY_SIDEBAR_BLUEPRINTS.map((item) => ({
        key: item.key,
        page: typeof item.page === 'function' ? item.page(viewMode) : item.page,
        label: t(item.labelKey),
        icon: item.icon,
    }));
}
