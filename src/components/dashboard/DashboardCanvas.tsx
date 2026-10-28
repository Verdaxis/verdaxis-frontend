import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { useNamespace } from '../../hooks/useNamespace';
import type { DashboardSaveResult } from '../../hooks/useDashboardLayout';
import {
  ROW_UNIT_REM,
  WIDGET_CATALOG,
  addWidget,
  canAddWidget,
  canMove,
  canResize,
  layoutsEqual,
  moveWidget,
  normalizeLayout,
  readingOrder,
  removeWidget,
  resizeWidget,
  type DashboardLayout,
  type DashboardWidget,
  type DashboardWidgetType,
  type MoveDirection,
  type ResizeDirection,
} from '../../utils/dashboardLayout';

interface DashboardCanvasProps {
  layout: DashboardLayout;
  defaultLayout: DashboardLayout;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  /** Widgets the current view can show. Others are neither drawn nor offered. */
  isAvailable: (type: DashboardWidgetType) => boolean;
  renderWidget: (type: DashboardWidgetType) => React.ReactNode;
  onSave: (layout: DashboardLayout) => Promise<DashboardSaveResult>;
  /** Called with the outcome so the page can say whether the layout was kept. */
  onSaved?: (result: DashboardSaveResult) => void;
}

const MOVES: { direction: MoveDirection; Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }> }[] = [
  { direction: 'left', Icon: ArrowLeft },
  { direction: 'right', Icon: ArrowRight },
  { direction: 'up', Icon: ArrowUp },
  { direction: 'down', Icon: ArrowDown },
];
const RESIZES: ResizeDirection[] = ['wider', 'narrower', 'taller', 'shorter'];

const controlButtonClass = 'inline-flex h-8 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';

const toolbarButtonClass = 'inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700';

/** CSS variables read by the md+ placement classes; see `cellClassName`. */
const cellStyle = (widget: DashboardWidget): React.CSSProperties => ({
  '--dash-col': `${widget.x + 1} / span ${widget.w}`,
  '--dash-row': `${widget.y + 1} / span ${widget.h}`,
  '--dash-h': `${widget.h * ROW_UNIT_REM}rem`,
} as React.CSSProperties);

// Below md the grid is one column in saved order (every cell spans the row).
// From md up the cell is placed on the 12-column grid. Spacing between rows is
// the cell's bottom padding, so a stacked default layout has the same 1.5rem
// rhythm as the page had before it became customizable.
const cellClassName = 'col-span-full min-w-0 pb-6 md:[grid-column:var(--dash-col)] md:[grid-row:var(--dash-row)]';

const frameClassName = (widget: DashboardWidget): string => (
  WIDGET_CATALOG[widget.type].sizing === 'fixed'
    ? 'h-[28rem] overflow-auto md:h-[var(--dash-h)]'
    : 'md:min-h-[var(--dash-h)]'
);

export const DashboardCanvas: React.FC<DashboardCanvasProps> = ({
  layout,
  defaultLayout,
  editing,
  onEditingChange,
  isAvailable,
  renderWidget,
  onSave,
  onSaved,
}) => {
  const { t } = useNamespace('dashboard');
  const [draft, setDraft] = useState<DashboardLayout | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<{ id: string; action: string } | null>(null);

  // Edits apply to the widgets this view can show. Others are not carried along.
  const visible = useCallback((source: DashboardLayout): DashboardLayout => ({
    version: 1,
    widgets: normalizeLayout(source.widgets.filter((widget) => isAvailable(widget.type))),
  }), [isAvailable]);

  useEffect(() => {
    if (!editing) {
      setDraft(null);
      setPickerOpen(false);
    }
  }, [editing]);

  const working = useMemo(
    () => (editing ? (draft ?? visible(layout)) : visible(layout)),
    [draft, editing, layout, visible],
  );
  const ordered = useMemo(() => readingOrder(working.widgets), [working]);
  const widgetLabel = useCallback(
    (type: DashboardWidgetType) => t(`commandCenter.customize.widgets.${type}.title`),
    [t],
  );

  // Reordering moves DOM nodes, which drops keyboard focus; put it back.
  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target || !gridRef.current) return;
    pendingFocus.current = null;
    const cell = gridRef.current.querySelector<HTMLElement>(`[data-widget-id="${target.id}"]`);
    if (!cell) {
      addButtonRef.current?.focus();
      return;
    }
    const button = cell.querySelector<HTMLButtonElement>(`[data-action="${target.action}"]`);
    if (button && !button.disabled) button.focus();
    else cell.querySelector<HTMLElement>('[data-widget-controls]')?.focus();
  }, [working]);

  const describePosition = (next: DashboardLayout, widget: DashboardWidget): string => {
    const order = readingOrder(next.widgets);
    return t('commandCenter.customize.announce.position', {
      widget: widgetLabel(widget.type),
      column: widget.x + 1,
      position: order.findIndex((entry) => entry.id === widget.id) + 1,
      count: order.length,
    });
  };

  const apply = (next: DashboardLayout, message: string, focus?: { id: string; action: string }) => {
    pendingFocus.current = focus ?? null;
    setDraft(next);
    setAnnouncement(message);
  };

  const handleMove = (widget: DashboardWidget, direction: MoveDirection) => {
    const next = moveWidget(working, widget.id, direction);
    const moved = next.widgets.find((entry) => entry.id === widget.id) as DashboardWidget;
    apply(next, describePosition(next, moved), { id: widget.id, action: `move-${direction}` });
  };

  const handleResize = (widget: DashboardWidget, direction: ResizeDirection) => {
    const next = resizeWidget(working, widget.id, direction);
    const resized = next.widgets.find((entry) => entry.id === widget.id) as DashboardWidget;
    apply(
      next,
      t('commandCenter.customize.announce.resized', {
        widget: widgetLabel(widget.type),
        width: resized.w,
        height: resized.h,
      }),
      { id: widget.id, action: `resize-${direction}` },
    );
  };

  const handleRemove = (widget: DashboardWidget) => {
    apply(
      removeWidget(working, widget.id),
      t('commandCenter.customize.announce.removed', { widget: widgetLabel(widget.type) }),
    );
  };

  const handleAdd = (type: DashboardWidgetType) => {
    const next = addWidget(working, type);
    setPickerOpen(false);
    apply(
      next,
      t('commandCenter.customize.announce.added', { widget: widgetLabel(type) }),
      { id: type, action: 'move-up' },
    );
  };

  const handleReset = () => {
    apply(visible(defaultLayout), t('commandCenter.customize.announce.reset'));
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await onSave(working);
      setAnnouncement(t(result === 'saved'
        ? 'commandCenter.customize.announce.saved'
        : 'commandCenter.customize.announce.memoryOnly'));
      onSaved?.(result);
      onEditingChange(false);
    } finally {
      setSaving(false);
    }
  };

  const addable = (Object.keys(WIDGET_CATALOG) as DashboardWidgetType[])
    .filter((type) => isAvailable(type) && canAddWidget(working, type));
  const isDefault = layoutsEqual(working, visible(defaultLayout));

  return (
    <div>
      {editing && (
        <div
          role="group"
          aria-label={t('commandCenter.customize.toolbarLabel')}
          className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-3 dark:border-sky-900/60 dark:bg-sky-950/30"
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              ref={addButtonRef}
              type="button"
              onClick={() => setPickerOpen((open) => !open)}
              aria-expanded={pickerOpen}
              aria-controls="dashboard-widget-picker"
              className={toolbarButtonClass}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {t('commandCenter.customize.addWidget')}
            </button>
            <button type="button" onClick={handleReset} disabled={isDefault} className={toolbarButtonClass}>
              <RotateCcw className="h-4 w-4" aria-hidden />
              {t('commandCenter.customize.reset')}
            </button>
            <div className="ml-auto flex items-center gap-2">
              <button type="button" onClick={() => onEditingChange(false)} disabled={saving} className={toolbarButtonClass}>
                {t('commandCenter.customize.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {saving ? t('commandCenter.customize.saving') : t('commandCenter.customize.save')}
              </button>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{t('commandCenter.customize.hint')}</p>
          {pickerOpen && (
            <div
              id="dashboard-widget-picker"
              role="group"
              aria-label={t('commandCenter.customize.pickerLabel')}
              className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
            >
              {addable.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-400">{t('commandCenter.customize.addWidgetNone')}</p>
              ) : addable.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => handleAdd(type)}
                  data-picker-type={type}
                  className="rounded-md border border-slate-200 bg-white p-3 text-left transition-colors hover:border-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-slate-700 dark:bg-slate-900"
                >
                  <span className="block text-sm font-semibold text-slate-800 dark:text-white">
                    {t('commandCenter.customize.addNamed', { widget: widgetLabel(type) })}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                    {t(`commandCenter.customize.widgets.${type}.description`)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div role="status" aria-live="polite" className="sr-only" data-testid="dashboard-announcer">{announcement}</div>

      {ordered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 px-6 py-10 text-center dark:border-slate-700">
          <h2 className="text-base font-semibold text-slate-700 dark:text-slate-200">{t('commandCenter.customize.emptyTitle')}</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t(editing ? 'commandCenter.customize.emptyEditBody' : 'commandCenter.customize.emptyBody')}
          </p>
        </div>
      ) : (
        <div
          ref={gridRef}
          data-dashboard-grid
          data-editing={editing ? 'true' : undefined}
          className="-mb-6 grid grid-cols-1 items-start gap-x-6 md:grid-cols-12"
        >
          {ordered.map((widget) => {
            const label = widgetLabel(widget.type);
            return (
              <div
                key={widget.id}
                data-widget-id={widget.id}
                data-widget-type={widget.type}
                className={cellClassName}
                style={cellStyle(widget)}
              >
                {editing ? (
                  <div className="rounded-xl bg-sky-50/50 p-2 ring-2 ring-sky-400/60 dark:bg-sky-950/20">
                    <div
                      role="group"
                      aria-label={t('commandCenter.customize.controlsLabel', { widget: label })}
                      data-widget-controls
                      tabIndex={-1}
                      className="mb-2 flex flex-wrap items-center gap-1"
                    >
                      <span className="mr-2 text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-200">{label}</span>
                      {MOVES.map(({ direction, Icon }) => (
                        <button
                          key={direction}
                          type="button"
                          data-action={`move-${direction}`}
                          aria-label={t(`commandCenter.customize.move.${direction}`, { widget: label })}
                          title={t(`commandCenter.customize.move.${direction}`, { widget: label })}
                          disabled={!canMove(working, widget.id, direction)}
                          onClick={() => handleMove(widget, direction)}
                          className={controlButtonClass}
                        >
                          <Icon className="h-4 w-4" aria-hidden />
                        </button>
                      ))}
                      {RESIZES.map((direction) => (
                        <button
                          key={direction}
                          type="button"
                          data-action={`resize-${direction}`}
                          aria-label={t(`commandCenter.customize.resize.${direction}`, { widget: label })}
                          disabled={!canResize(working, widget.id, direction)}
                          onClick={() => handleResize(widget, direction)}
                          className={controlButtonClass}
                        >
                          {t(`commandCenter.customize.resizeShort.${direction}`)}
                        </button>
                      ))}
                      <button
                        type="button"
                        data-action="remove"
                        aria-label={t('commandCenter.customize.remove', { widget: label })}
                        title={t('commandCenter.customize.remove', { widget: label })}
                        onClick={() => handleRemove(widget)}
                        className={`${controlButtonClass} ml-auto text-red-700 dark:text-red-300`}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                    {/* Inert: a preview, so a stray click cannot confirm a trade. */}
                    <div inert className={`pointer-events-none select-none ${frameClassName(widget)}`}>
                      {renderWidget(widget.type)}
                    </div>
                  </div>
                ) : (
                  <div className={frameClassName(widget)}>{renderWidget(widget.type)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
