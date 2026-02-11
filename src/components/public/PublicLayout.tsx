import React from 'react';
import { PublicNav } from './PublicNav';
import { PublicFooter } from './PublicFooter';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: '#F8FAFC',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <PublicNav />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <PublicFooter />
    </div>
  );
};
