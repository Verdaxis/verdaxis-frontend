import { describe, expect, it } from 'vitest';
import {
  DASHBOARD_WIDGET_TYPES,
  MAX_WIDGETS,
  addWidget,
  canMove,
  canResize,
  defaultLayout,
  fitsBackendLimits,
  layoutsEqual,
  moveWidget,
  normalizeLayout,
  readingOrder,
  removeWidget,
  resizeWidget,
  sanitizeLayout,
  toStoredLayout,
  widgetTypesForViewMode,
  type DashboardLayout,
  type DashboardWidget,
} from '../utils/dashboardLayout';

const widget = (id: string, x: number, y: number, w: number, h: number, type = 'my_trades'): DashboardWidget => ({
  id, type: type as DashboardWidget['type'], x, y, w, h,
});
const layoutOf = (...widgets: DashboardWidget[]): DashboardLayout => ({ version: 1, widgets });
const byId = (layout: DashboardLayout, id: string) => layout.widgets.find((entry) => entry.id === id)!;

const overlaps = (layout: DashboardLayout) => layout.widgets.some((a, i) => layout.widgets.slice(i + 1).some((b) => (
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
)));

describe('dashboard layout: defaults', () => {
  it('lists the nine widget types shared with the backend validator', () => {
    expect([...DASHBOARD_WIDGET_TYPES]).toEqual([
      'quick_actions', 'trade_summary', 'needs_attention', 'market_radar', 'supplier_demand',
      'forward_curve', 'order_book', 'trade_tape', 'my_trades',
    ]);
  });

  it("matches today's home sections, in order, per view mode", () => {
    expect(defaultLayout('BUYER').widgets.map((entry) => entry.type)).toEqual([
      'quick_actions', 'trade_summary', 'needs_attention', 'market_radar',
    ]);
    expect(defaultLayout('SUPPLIER').widgets.map((entry) => entry.type)).toEqual([
      'quick_actions', 'trade_summary', 'needs_attention', 'market_radar', 'supplier_demand',
    ]);
  });

  it('stacks every default section full width without overlaps and is already packed', () => {
    for (const mode of ['BUYER', 'SUPPLIER'] as const) {
      const layout = defaultLayout(mode);
      expect(layout.widgets.every((entry) => entry.x === 0 && entry.w === 12)).toBe(true);
      expect(overlaps(layout)).toBe(false);
      expect(normalizeLayout(layout.widgets)).toEqual(layout.widgets);
      expect(fitsBackendLimits(layout)).toBe(true);
    }
  });

  it('offers the supplier demand feed to suppliers only', () => {
    expect(widgetTypesForViewMode('BUYER')).not.toContain('supplier_demand');
    expect(widgetTypesForViewMode('SUPPLIER')).toContain('supplier_demand');
  });
});

describe('dashboard layout: reading a stored layout', () => {
  const valid = toStoredLayout(defaultLayout('BUYER'));

  it('accepts a valid layout unchanged', () => {
    expect(sanitizeLayout(valid)).toEqual(valid);
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'x'],
    ['a wrong version', { version: 2, widgets: [] }],
    ['a missing version', { widgets: [] }],
    ['widgets that are not a list', { version: 1, widgets: {} }],
  ])('ignores %s', (_name, raw) => {
    expect(sanitizeLayout(raw)).toBeNull();
  });

  it('drops unknown widget types and keeps the rest', () => {
    const result = sanitizeLayout({
      version: 1,
      widgets: [
        { id: 'a', type: 'weather', x: 0, y: 0, w: 12, h: 2 },
        { id: 'b', type: 'trade_tape', x: 0, y: 2, w: 6, h: 4 },
      ],
    });
    expect(result?.widgets.map((entry) => entry.type)).toEqual(['trade_tape']);
    expect(result?.widgets[0].y).toBe(0);
  });

  it('uses the default when every widget is refused, but keeps a deliberately empty layout', () => {
    expect(sanitizeLayout({ version: 1, widgets: [{ id: 'a', type: 'weather', x: 0, y: 0, w: 1, h: 1 }] })).toBeNull();
    expect(sanitizeLayout({ version: 1, widgets: [] })).toEqual({ version: 1, widgets: [] });
  });

  it.each([
    ['x out of range', { x: 12 }],
    ['negative y', { y: -1 }],
    ['y above 199', { y: 200 }],
    ['zero width', { w: 0 }],
    ['height above 12', { h: 13 }],
    ['fractional', { w: 2.5 }],
    ['a string number', { h: '3' }],
    ['past column twelve', { x: 8, w: 6 }],
    ['an id with a space', { id: 'a b' }],
    ['an empty id', { id: '' }],
    ['an id over 64 characters', { id: 'x'.repeat(65) }],
  ])('drops a widget with %s', (_name, patch) => {
    const raw = { version: 1, widgets: [
      { id: 'good', type: 'my_trades', x: 0, y: 0, w: 4, h: 2 },
      { id: 'bad', type: 'trade_tape', x: 0, y: 5, w: 4, h: 2, ...patch },
    ] };
    expect(sanitizeLayout(raw)?.widgets.map((entry) => entry.id)).toEqual(['good']);
  });

  it('keeps one widget per id and per type, and caps the list', () => {
    const duplicates = sanitizeLayout({ version: 1, widgets: [
      { id: 'a', type: 'my_trades', x: 0, y: 0, w: 4, h: 2 },
      { id: 'a', type: 'order_book', x: 4, y: 0, w: 4, h: 2 },
      { id: 'b', type: 'my_trades', x: 8, y: 0, w: 4, h: 2 },
    ] });
    expect(duplicates?.widgets.map((entry) => entry.id)).toEqual(['a']);
    const many = { version: 1, widgets: Array.from({ length: 40 }, (_, i) => (
      { id: `w${i}`, type: DASHBOARD_WIDGET_TYPES[i % 9], x: 0, y: i, w: 1, h: 1 }
    )) };
    expect(sanitizeLayout(many)!.widgets.length).toBeLessThanOrEqual(MAX_WIDGETS);
  });

  it('packs overlapping widgets apart', () => {
    const result = sanitizeLayout({ version: 1, widgets: [
      { id: 'a', type: 'my_trades', x: 0, y: 0, w: 12, h: 4 },
      { id: 'b', type: 'trade_tape', x: 0, y: 1, w: 6, h: 4 },
    ] })!;
    expect(overlaps(result)).toBe(false);
  });

  it('sends only the schema keys', () => {
    const stored = toStoredLayout({ version: 1, widgets: [{ ...widget('a', 0, 0, 1, 1), extra: true } as DashboardWidget] });
    expect(Object.keys(stored)).toEqual(['version', 'widgets']);
    expect(Object.keys(stored.widgets[0]).sort()).toEqual(['h', 'id', 'type', 'w', 'x', 'y']);
  });
});

describe('dashboard layout: editing', () => {
  const stacked = () => layoutOf(
    widget('a', 0, 0, 12, 2, 'quick_actions'),
    widget('b', 0, 2, 12, 2, 'trade_summary'),
    widget('c', 0, 4, 12, 3, 'needs_attention'),
  );

  it('moves a widget down and up by one position in the order', () => {
    const down = moveWidget(stacked(), 'a', 'down');
    expect(readingOrder(down.widgets).map((entry) => entry.id)).toEqual(['b', 'a', 'c']);
    expect(overlaps(down)).toBe(false);
    const up = moveWidget(down, 'a', 'up');
    expect(readingOrder(up.widgets).map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
    expect(up.widgets.map((entry) => entry.y)).toEqual([0, 2, 4]);
  });

  it('refuses to move past the edges', () => {
    const layout = stacked();
    expect(canMove(layout, 'a', 'up')).toBe(false);
    expect(canMove(layout, 'c', 'down')).toBe(false);
    expect(canMove(layout, 'a', 'left')).toBe(false);
    expect(canMove(layout, 'a', 'right')).toBe(false);
    expect(moveWidget(layout, 'a', 'up')).toBe(layout);
  });

  it('shifts one column left and right inside the grid', () => {
    const layout = layoutOf(widget('a', 2, 0, 4, 2));
    expect(byId(moveWidget(layout, 'a', 'left'), 'a').x).toBe(1);
    expect(byId(moveWidget(layout, 'a', 'right'), 'a').x).toBe(3);
    const atEdge = layoutOf(widget('a', 8, 0, 4, 2));
    expect(canMove(atEdge, 'a', 'right')).toBe(false);
  });

  it('puts widgets side by side after narrowing, and stacks them again when they collide', () => {
    let layout = stacked();
    layout = resizeWidget(layout, 'b', 'narrower');
    expect(byId(layout, 'b').w).toBe(11);
    for (let i = 0; i < 5; i += 1) layout = resizeWidget(layout, 'b', 'narrower');
    expect(byId(layout, 'b').w).toBe(6);
    layout = resizeWidget(layout, 'c', 'narrower');
    for (let i = 0; i < 5; i += 1) layout = resizeWidget(layout, 'c', 'narrower');
    layout = moveWidget(layout, 'c', 'right');
    layout = moveWidget(layout, 'c', 'right');
    for (let i = 0; i < 4; i += 1) layout = moveWidget(layout, 'c', 'right');
    expect(byId(layout, 'c').x).toBe(6);
    expect(overlaps(layout)).toBe(false);
    // c now sits beside b, in the same rows.
    expect(byId(layout, 'c').y).toBe(byId(layout, 'b').y);
  });

  it('resizes within 1..12 and never past column twelve', () => {
    const layout = layoutOf(widget('a', 6, 0, 6, 12));
    expect(canResize(layout, 'a', 'wider')).toBe(false);
    expect(canResize(layout, 'a', 'taller')).toBe(false);
    expect(byId(resizeWidget(layout, 'a', 'shorter'), 'a').h).toBe(11);
    expect(byId(resizeWidget(layout, 'a', 'narrower'), 'a').w).toBe(5);
    const small = layoutOf(widget('a', 0, 0, 1, 1));
    expect(canResize(small, 'a', 'narrower')).toBe(false);
    expect(canResize(small, 'a', 'shorter')).toBe(false);
  });

  it('pushes the widgets below when one grows taller', () => {
    const grown = resizeWidget(stacked(), 'a', 'taller');
    expect(byId(grown, 'a').h).toBe(3);
    expect(byId(grown, 'b').y).toBe(3);
    expect(byId(grown, 'c').y).toBe(5);
  });

  it('removes a widget and closes the gap', () => {
    const removed = removeWidget(stacked(), 'b');
    expect(removed.widgets.map((entry) => entry.id)).toEqual(['a', 'c']);
    expect(byId(removed, 'c').y).toBe(2);
  });

  it('adds a widget at the bottom with its catalog size, once per type', () => {
    const added = addWidget(stacked(), 'order_book');
    const order = byId(added, 'order_book');
    expect(order).toMatchObject({ type: 'order_book', x: 0, w: 6, h: 10, y: 7 });
    expect(addWidget(added, 'order_book')).toBe(added);
  });

  it('stops adding at 24 widgets', () => {
    const full = layoutOf(...Array.from({ length: MAX_WIDGETS }, (_, i) => widget(`w${i}`, 0, i, 1, 1, 'trade_tape')));
    expect(addWidget(full, 'order_book')).toBe(full);
  });

  it('compares layouts by content, not array order', () => {
    const a = stacked();
    expect(layoutsEqual(a, layoutOf(...[...a.widgets].reverse()))).toBe(true);
    expect(layoutsEqual(a, resizeWidget(a, 'a', 'taller'))).toBe(false);
  });

  it('keeps every edit inside the backend limits', () => {
    let layout = defaultLayout('SUPPLIER');
    for (const type of widgetTypesForViewMode('SUPPLIER')) layout = addWidget(layout, type);
    for (const id of layout.widgets.map((entry) => entry.id)) layout = moveWidget(layout, id, 'down');
    expect(fitsBackendLimits(layout)).toBe(true);
    expect(overlaps(layout)).toBe(false);
  });
});
