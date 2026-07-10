import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import i18n from '../i18n';

interface WrapperProps {
  children: React.ReactNode;
}

interface RouterOptions {
  /** Initial URL for the MemoryRouter (defaults to '/'). */
  route?: string;
  /** Route path to mount the UI at; requires `route` to match it. */
  path?: string;
}

function makeAllProviders({ route, path }: RouterOptions) {
  return function AllProviders({ children }: WrapperProps) {
    return (
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={route ? [route] : undefined}>
          {path ? (
            <Routes>
              <Route path={path} element={children} />
            </Routes>
          ) : (
            children
          )}
        </MemoryRouter>
      </I18nextProvider>
    );
  };
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & RouterOptions,
) {
  const { route, path, ...renderOptions } = options ?? {};
  return render(ui, { wrapper: makeAllProviders({ route, path }), ...renderOptions });
}

export * from '@testing-library/react';
