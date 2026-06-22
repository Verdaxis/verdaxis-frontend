import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tooltip } from '../components/ui/Tooltip';

describe('Tooltip', () => {
  it('does not render an empty tooltip marker', () => {
    const { container } = render(
      <Tooltip content="" position="right">
        <button type="button">Marketplace</button>
      </Tooltip>
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Marketplace' }));

    expect(container.querySelector('.bg-slate-900')).toBeNull();
  });

  it('renders tooltip content when a label is provided', () => {
    render(
      <Tooltip content="Marketplace" position="right">
        <button type="button">Icon</button>
      </Tooltip>
    );

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Icon' }));

    expect(screen.getByText('Marketplace')).toBeTruthy();
  });
});
