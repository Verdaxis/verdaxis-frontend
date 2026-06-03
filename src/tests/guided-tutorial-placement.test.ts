import { afterEach, describe, expect, it } from 'vitest';
import { resolveViewportAwarePlacement, type TutorialStepDefinition } from '../components/GuidedTutorial';

const originalInnerWidth = window.innerWidth;
const originalInnerHeight = window.innerHeight;

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
  window.dispatchEvent(new Event('resize'));
}

function makeRect(partial: Partial<DOMRect>): DOMRect {
  const rect = {
    x: partial.x ?? partial.left ?? 0,
    y: partial.y ?? partial.top ?? 0,
    width: partial.width ?? Math.max(0, (partial.right ?? 0) - (partial.left ?? 0)),
    height: partial.height ?? Math.max(0, (partial.bottom ?? 0) - (partial.top ?? 0)),
    top: partial.top ?? partial.y ?? 0,
    right: partial.right ?? (partial.left ?? partial.x ?? 0) + (partial.width ?? 0),
    bottom: partial.bottom ?? (partial.top ?? partial.y ?? 0) + (partial.height ?? 0),
    left: partial.left ?? partial.x ?? 0,
    toJSON: () => ({}),
  };
  return rect as DOMRect;
}

function addTarget(selector: string, rect: DOMRect) {
  const id = selector.startsWith('#') ? selector.slice(1) : selector;
  const target = document.createElement('button');
  target.id = id;
  target.getBoundingClientRect = () => rect;
  document.body.appendChild(target);
}

function step(overrides: Partial<TutorialStepDefinition>): TutorialStepDefinition {
  return {
    target: '#target',
    titleKey: 'title',
    contentKey: 'content',
    placement: 'bottom',
    ...overrides,
  };
}

describe('guided tutorial viewport-aware placement', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    setViewport(originalInnerWidth, originalInnerHeight);
  });

  it('flips a bottom-start tooltip upward on a short forward-curve viewport', () => {
    setViewport(1365, 620);
    addTarget('#target', makeRect({ left: 310, right: 900, top: 548, bottom: 584 }));

    expect(resolveViewportAwarePlacement(step({ placement: 'bottom-start' }))).toBe('top-start');
  });

  it('moves a right-side dropdown tooltip left when it would cover the control area', () => {
    setViewport(1024, 560);
    addTarget('#target', makeRect({ left: 760, right: 970, top: 160, bottom: 205 }));

    expect(resolveViewportAwarePlacement(step({ placement: 'right', mode: 'click' }))).toBe('left');
  });

  it('keeps normal sidebar tooltips on the right when there is enough room', () => {
    setViewport(768, 520);
    addTarget('#target', makeRect({ left: 12, right: 220, top: 180, bottom: 225 }));

    expect(resolveViewportAwarePlacement(step({ placement: 'right', mode: 'click' }))).toBe('right');
  });

  it('falls back to center when no side can fit a click-step tooltip', () => {
    setViewport(640, 420);
    addTarget('#target', makeRect({ left: 260, right: 380, top: 180, bottom: 230 }));

    expect(resolveViewportAwarePlacement(step({ placement: 'bottom', mode: 'click' }))).toBe('center');
  });

  it('leaves body and temporarily missing targets unchanged', () => {
    setViewport(1024, 560);

    expect(resolveViewportAwarePlacement(step({ target: 'body', placement: 'center' }))).toBe('center');
    expect(resolveViewportAwarePlacement(step({ target: '#not-mounted-yet', placement: 'left' }))).toBe('left');
  });
});
