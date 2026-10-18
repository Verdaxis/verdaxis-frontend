import React, { useLayoutEffect } from 'react';
import { afterEach } from 'vitest';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { createQueryClient } from '../lib/query/client';
import { render, type RenderOptions } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import i18n from '../i18n';

interface WrapperProps {
  children: React.ReactNode;
}

interface RouterOptions {
  queryClient?: QueryClient;
  /** Initial URL for the MemoryRouter (defaults to '/'). */
  route?: string;
  /** Route path to mount the UI at; requires `route` to match it. */
  path?: string;
}

function makeAllProviders({ route, path, queryClient }: RouterOptions) {
  return function AllProviders({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient!}>
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
      </QueryClientProvider>
    );
  };
}

const pendingClients = new Map<QueryClient, () => void>();
afterEach(async () => {
  for (const [client, unmount] of pendingClients) {
    unmount();
    await client.cancelQueries();
    client.clear();
  }
  pendingClients.clear();
});

export function createQueryTestWrapper(client = createQueryClient()) {
  const Wrapper = ({ children }: WrapperProps) => {
    useLayoutEffect(() => () => {
      void client.cancelQueries();
      client.clear();
    }, []);
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
  return { client, Wrapper, dispose: async () => { await client.cancelQueries(); client.clear(); } };
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & RouterOptions,
) {
  const { route, path, queryClient = createQueryClient(), ...renderOptions } = options ?? {};
  const view = render(ui, { wrapper: makeAllProviders({ route, path, queryClient }), ...renderOptions });
  const disposeQueries = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    pendingClients.delete(queryClient);
  };
  pendingClients.set(queryClient, view.unmount);
  return { ...view, queryClient, disposeQueries };

}

export * from '@testing-library/react';
