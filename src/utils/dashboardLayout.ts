/**
 * Home dashboard layout: the data model, the default layouts, validation of a
 * stored layout, and the editing operations.
 *
 * The stored shape is the `dashboard` preference namespace of the Rust backend
 * (`rs/read/src/crud/preferences/dashboard.rs`). The backend refuses unknown keys,
 * so only `version` and `widgets` may be sent, and `DASHBOARD_WIDGET_TYPES` must
 * stay equal to its `WIDGET_TYPES`.
 *
 * Grid model: 12 columns. `x`/`w` are columns. `y`/`h` are grid rows. Rows are
 * sized by their content, so `h` is a minimum height: one row unit is
 * `ROW_UNIT_REM`. Layouts are kept packed (no widget floats above free space)
 * and free of overlaps by `normalizeLayout`.
 */
import type { ViewMode } from '../types';

export const DASHBOARD_PREFERENCE_NAMESPACE = 'dashboard';

export const DASHBOARD_WIDGET_TYPES = [
  'quick_actions',
  'trade_summary',
  'needs_attention',
  'market_radar',
  'supplier_demand',
  'forward_curve',
  'order_book',
  'trade_tape',
  'my_trades',
] as const;

export type DashboardWidgetType = typeof DASHBOARD_WIDGET_TYPES[number];

export interface DashboardWidget {
  id: string;
  type: DashboardWidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardLayout {
  version: 1;
  widgets: DashboardWidget[];
}

export const GRID_COLUMNS = 12;
export const MAX_WIDGETS = 24;
export const MAX_ROW = 199;
export const MAX_SPAN = 12;
/** One grid row unit, in rem. A widget is at least `h` units tall. */
export const ROW_UNIT_REM = 2.5;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export type SizingMode =
  /** Grows with its content; `h` is only a minimum. */
  | 'content'
  /** Exactly `h` units tall; its content scrolls inside. */
  | 'fixed';

interface WidgetCatalogEntry {
  /** Size and mode used when the widget is added from the picker. */
  size: { w: number; h: number };
  sizing: SizingMode;
  /** Only offered (and rendered) in this view mode. */
  viewMode?: ViewMode;
}

export const WIDGET_CATALOG: Record<DashboardWidgetType, WidgetCatalogEntry> = {
  quick_actions: { size: { w: 12, h: 2 }, sizing: 'content' },
  trade_summary: { size: { w: 12, h: 2 }, sizing: 'content' },
  needs_attention: { size: { w: 12, h: 3 }, sizing: 'content' },
  market_radar: { size: { w: 12, h: 3 }, sizing: 'content' },
  supplier_demand: { size: { w: 12, h: 3 }, sizing: 'content', viewMode: 'SUPPLIER' },
  forward_curve: { size: { w: 12, h: 12 }, sizing: 'fixed' },
  order_book: { size: { w: 6, h: 10 }, sizing: 'fixed' },
  trade_tape: { size: { w: 6, h: 10 }, sizing: 'fixed' },
  my_trades: { size: { w: 12, h: 10 }, sizing: 'fixed' },
};

const isWidgetType = (value: unknown): value is DashboardWidgetType => (
  typeof value === 'string' && (DASHBOARD_WIDGET_TYPES as readonly string[]).includes(value)
);

/** Widget types the current view mode can show. */
export const widgetTypesForViewMode = (viewMode: ViewMode): DashboardWidgetType[] => (
  DASHBOARD_WIDGET_TYPES.filter((type) => {
    const only = WIDGET_CATALOG[type].viewMode;
    return only === undefined || only === viewMode;
  })
);

// ---------------------------------------------------------------------------
// Packing
// ---------------------------------------------------------------------------

const columnsOverlap = (a: DashboardWidget, b: DashboardWidget): boolean => (
  a.x < b.x + b.w && b.x < a.x + a.w
);

/** Reading order: top to bottom, then left to right. Also the mobile order. */
export const readingOrder = (widgets: readonly DashboardWidget[]): DashboardWidget[] => (
  widgets
    .map((widget, index) => ({ widget, index }))
    .sort((a, b) => (a.widget.y - b.widget.y) || (a.widget.x - b.widget.x) || (a.index - b.index))
    .map(({ widget }) => widget)
);

/**
 * Packs widgets upward without overlaps. Widgets keep their requested order
 * (by `y`, then `x`); the `priorityId` widget wins ties on `y`, so a widget the
 * user just moved keeps its place and its neighbours give way.
 */
export const normalizeLayout = (
  widgets: readonly DashboardWidget[],
  priorityId?: string,
): DashboardWidget[] => {
  const ordered = widgets
    .map((widget, index) => ({ widget, index }))
    .sort((a, b) => (
      (a.widget.y - b.widget.y)
      || ((a.widget.id === priorityId ? 0 : 1) - (b.widget.id === priorityId ? 0 : 1))
      || (a.widget.x - b.widget.x)
      || (a.index - b.index)
    ))
    .map(({ widget }) => widget);

  const placed: DashboardWidget[] = [];
  for (const widget of ordered) {
    const y = placed
      .filter((other) => columnsOverlap(widget, other))
      .reduce((floor, other) => Math.max(floor, other.y + other.h), 0);
    placed.push({ ...widget, y });
  }
  // Keep the caller's array order so React keys and list positions stay stable.
  return widgets.map((widget) => placed.find((entry) => entry.id === widget.id) as DashboardWidget);
};

const withWidgets = (widgets: DashboardWidget[]): DashboardLayout => ({ version: 1, widgets });

// ---------------------------------------------------------------------------
// Default layouts
// ---------------------------------------------------------------------------

const stack = (types: DashboardWidgetType[]): DashboardWidget[] => {
  let y = 0;
  return types.map((type) => {
    const { w, h } = WIDGET_CATALOG[type].size;
    const widget: DashboardWidget = { id: type, type, x: 0, y, w, h };
    y += h;
    return widget;
  });
};

/**
 * Today's home, section by section: actions, trade counts, the action queue,
 * the watchlist radar and, for suppliers, the demand feed.
 */
export const defaultLayout = (viewMode: ViewMode): DashboardLayout => ({
  version: 1,
  widgets: stack([
    'quick_actions',
    'trade_summary',
    'needs_attention',
    'market_radar',
    ...(viewMode === 'SUPPLIER' ? ['supplier_demand' as const] : []),
  ]),
});

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const isIntegerInRange = (value: unknown, min: number, max: number): value is number => (
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
);

const parseWidget = (raw: unknown): DashboardWidget | null => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const item = raw as Record<string, unknown>;
  const { id, type, x, y, w, h } = item;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) return null;
  if (!isWidgetType(type)) return null;
  if (!isIntegerInRange(x, 0, GRID_COLUMNS - 1)) return null;
  if (!isIntegerInRange(y, 0, MAX_ROW)) return null;
  if (!isIntegerInRange(w, 1, MAX_SPAN) || !isIntegerInRange(h, 1, MAX_SPAN)) return null;
  if (x + w > GRID_COLUMNS) return null;
  return { id, type, x, y, w, h };
};

/**
 * Reads a stored layout. Returns `null` when the value cannot be used (wrong
 * shape or version, or every widget was refused), which means "use the default".
 * Unknown widget types and invalid widgets are dropped; a widget type is kept
 * once, and overlaps are packed away.
 */
export const sanitizeLayout = (raw: unknown): DashboardLayout | null => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const { version, widgets } = raw as Record<string, unknown>;
  if (version !== 1 || !Array.isArray(widgets)) return null;

  const ids = new Set<string>();
  const types = new Set<DashboardWidgetType>();
  const kept: DashboardWidget[] = [];
  for (const item of widgets) {
    const widget = parseWidget(item);
    if (!widget || ids.has(widget.id) || types.has(widget.type)) continue;
    ids.add(widget.id);
    types.add(widget.type);
    kept.push(widget);
    if (kept.length === MAX_WIDGETS) break;
  }
  // An empty list is a deliberate empty home; a list that lost everything is not.
  if (widgets.length > 0 && kept.length === 0) return null;

  const packed = normalizeLayout(kept);
  if (packed.some((widget) => widget.y > MAX_ROW)) return null;
  return { version: 1, widgets: packed };
};

/** The exact body the backend accepts: no keys beyond the schema. */
export const toStoredLayout = (layout: DashboardLayout): DashboardLayout => ({
  version: 1,
  widgets: layout.widgets.map(({ id, type, x, y, w, h }) => ({ id, type, x, y, w, h })),
});

export const layoutsEqual = (a: DashboardLayout, b: DashboardLayout): boolean => (
  JSON.stringify(toStoredLayout({ version: 1, widgets: readingOrder(a.widgets) }))
  === JSON.stringify(toStoredLayout({ version: 1, widgets: readingOrder(b.widgets) }))
);

// ---------------------------------------------------------------------------
// Editing
// ---------------------------------------------------------------------------

export type MoveDirection = 'left' | 'right' | 'up' | 'down';
export type ResizeDirection = 'wider' | 'narrower' | 'taller' | 'shorter';

const find = (layout: DashboardLayout, id: string) => layout.widgets.find((widget) => widget.id === id);

/** Nearest widget above `target` that shares columns with it. */
const neighbourAbove = (layout: DashboardLayout, target: DashboardWidget) => (
  layout.widgets
    .filter((other) => other.id !== target.id && columnsOverlap(target, other) && other.y + other.h <= target.y)
    .sort((a, b) => (b.y + b.h) - (a.y + a.h))[0]
);

/** Nearest widget below `target` that shares columns with it. */
const neighbourBelow = (layout: DashboardLayout, target: DashboardWidget) => (
  layout.widgets
    .filter((other) => other.id !== target.id && columnsOverlap(target, other) && other.y >= target.y + target.h)
    .sort((a, b) => a.y - b.y)[0]
);

export const canMove = (layout: DashboardLayout, id: string, direction: MoveDirection): boolean => {
  const widget = find(layout, id);
  if (!widget) return false;
  switch (direction) {
    case 'left': return widget.x > 0;
    case 'right': return widget.x + widget.w < GRID_COLUMNS;
    case 'up': return neighbourAbove(layout, widget) !== undefined;
    case 'down': return neighbourBelow(layout, widget) !== undefined;
  }
};

/**
 * Left and right shift one column. Up and down jump over the nearest widget in
 * that direction, so every press changes the order.
 */
export const moveWidget = (layout: DashboardLayout, id: string, direction: MoveDirection): DashboardLayout => {
  const widget = find(layout, id);
  if (!widget || !canMove(layout, id, direction)) return layout;

  let moved: DashboardWidget = widget;
  if (direction === 'left') moved = { ...widget, x: widget.x - 1 };
  if (direction === 'right') moved = { ...widget, x: widget.x + 1 };
  if (direction === 'up') moved = { ...widget, y: (neighbourAbove(layout, widget) as DashboardWidget).y };
  if (direction === 'down') moved = { ...widget, y: (neighbourBelow(layout, widget) as DashboardWidget).y + 1 };

  const widgets = layout.widgets.map((entry) => (entry.id === id ? moved : entry));
  return withWidgets(normalizeLayout(widgets, id));
};

export const canResize = (layout: DashboardLayout, id: string, direction: ResizeDirection): boolean => {
  const widget = find(layout, id);
  if (!widget) return false;
  switch (direction) {
    case 'wider': return widget.x + widget.w < GRID_COLUMNS;
    case 'narrower': return widget.w > 1;
    case 'taller': return widget.h < MAX_SPAN;
    case 'shorter': return widget.h > 1;
  }
};

export const resizeWidget = (layout: DashboardLayout, id: string, direction: ResizeDirection): DashboardLayout => {
  const widget = find(layout, id);
  if (!widget || !canResize(layout, id, direction)) return layout;

  const resized: DashboardWidget = {
    ...widget,
    w: widget.w + (direction === 'wider' ? 1 : direction === 'narrower' ? -1 : 0),
    h: widget.h + (direction === 'taller' ? 1 : direction === 'shorter' ? -1 : 0),
  };
  const widgets = layout.widgets.map((entry) => (entry.id === id ? resized : entry));
  return withWidgets(normalizeLayout(widgets, id));
};

export const removeWidget = (layout: DashboardLayout, id: string): DashboardLayout => (
  withWidgets(normalizeLayout(layout.widgets.filter((widget) => widget.id !== id)))
);

export const canAddWidget = (layout: DashboardLayout, type: DashboardWidgetType): boolean => (
  layout.widgets.length < MAX_WIDGETS && !layout.widgets.some((widget) => widget.type === type)
);

/** Adds a widget at the bottom with its catalog size. One widget per type. */
export const addWidget = (layout: DashboardLayout, type: DashboardWidgetType): DashboardLayout => {
  if (!canAddWidget(layout, type)) return layout;
  const { w, h } = WIDGET_CATALOG[type].size;
  const bottom = layout.widgets.reduce((floor, widget) => Math.max(floor, widget.y + widget.h), 0);
  const added: DashboardWidget = { id: type, type, x: 0, y: bottom, w, h };
  return withWidgets(normalizeLayout([...layout.widgets, added]));
};

/** True when every field is inside the backend's limits. */
export const fitsBackendLimits = (layout: DashboardLayout): boolean => (
  layout.widgets.length <= MAX_WIDGETS
  && layout.widgets.every((widget) => parseWidget(widget) !== null)
  && new Set(layout.widgets.map((widget) => widget.id)).size === layout.widgets.length
);
