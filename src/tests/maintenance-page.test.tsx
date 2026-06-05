import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MaintenancePage } from '../pages/MaintenancePage';

describe('MaintenancePage', () => {
  it('communicates maintenance state and lets users retry', () => {
    const onRetry = vi.fn();

    render(<MaintenancePage onRetry={onRetry} />);

    expect(screen.getByText(/temporarily under maintenance/i)).toBeTruthy();
    expect(screen.getByText(/will be back shortly/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /check again/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

