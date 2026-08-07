import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

import i18n, { loadNamespace } from '../../../i18n';
import { NotFoundPage } from '../NotFoundPage';
import { TermsPage } from '../TermsPage';

describe('public Chinese translations', () => {
  beforeAll(async () => {
    await loadNamespace('public');
    await i18n.changeLanguage('zh');
  });

  afterAll(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders representative legal and fallback copy without English fallback', () => {
    const terms = render(<TermsPage />);
    expect(screen.getByRole('heading', { name: '1. 接受条款' })).toBeTruthy();
    expect(document.title).toBe('服务条款 — Verdaxis');
    terms.unmount();

    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('您查找的页面不存在或已被移动。')).toBeTruthy();
    expect(document.title).toBe('页面未找到 — Verdaxis');
  });
});
