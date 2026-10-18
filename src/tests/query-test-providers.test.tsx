import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { render, fireEvent, screen } from '@testing-library/react';
import { renderWithProviders, createQueryTestWrapper } from './test-utils';

function Probe({ seen }: { seen: Set<unknown> }) { seen.add(useQueryClient()); return <span>probe</span>; }

describe('feature test Query providers', () => {
    it('isolates independent renders and preserves the client across rerender', () => {
        const first = new Set(); const second = new Set();
        const a = renderWithProviders(<Probe seen={first} />);
        const b = renderWithProviders(<Probe seen={second} />);
        expect([...first][0]).not.toBe([...second][0]);
        a.rerender(<Probe seen={first} />);
        expect(first.size).toBe(1);
        a.unmount(); b.unmount();
    });

    it('keeps one client across route-away and back through a custom wrapper', () => {
        const fixture = createQueryTestWrapper();
        const seen = new Set();
        function Navigation() {
            const navigate = useNavigate();
            return <><button onClick={() => navigate('/away')}>away</button><button onClick={() => navigate('/')}>back</button></>;
        }
        const view = render(<fixture.Wrapper><MemoryRouter><Navigation /><Routes>
            <Route path="/" element={<Probe seen={seen} />} />
            <Route path="/away" element={<span>another workspace</span>} />
        </Routes></MemoryRouter></fixture.Wrapper>);
        fireEvent.click(screen.getByText('away'));
        fireEvent.click(screen.getByText('back'));
        expect(seen.size).toBe(1);
        expect([...seen][0]).toBe(fixture.client);
        view.unmount();
        expect(fixture.client.getQueryCache().getAll()).toHaveLength(0);
    });

    it('supplies a composable wrapper with explicit client and clears it after unmount', async () => {
        const fixture = createQueryTestWrapper();
        fixture.client.setQueryData(['public', 'test'], 'value');
        const view = renderWithProviders(<Probe seen={new Set()} />, { queryClient: fixture.client });
        expect(view.queryClient).toBe(fixture.client);
        view.unmount();
        await view.disposeQueries();
        expect(fixture.client.getQueryCache().getAll()).toHaveLength(0);
    });
});
