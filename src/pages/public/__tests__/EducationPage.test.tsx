import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import i18n, { loadNamespace } from '../../../i18n';
import { EducationPage } from '../EducationPage';
import { EducationArticlePage } from '../EducationArticlePage';
import { PartnersPage } from '../PartnersPage';

const renderWithRouter = (ui: React.ReactElement, { route = '/education' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      {ui}
    </MemoryRouter>
  );
};

/* ------------------------------------------------------------------ */
/*  EducationPage (Listing)                                            */
/* ------------------------------------------------------------------ */

describe('EducationPage', () => {
  it('renders page title', () => {
    renderWithRouter(<EducationPage />);
    expect(screen.getByText('Education & Resources')).toBeTruthy();
  });

  it('renders all 6 article cards', () => {
    renderWithRouter(<EducationPage />);
    expect(screen.getByText('What is Carbon Intensity and Why It Matters')).toBeTruthy();
    expect(screen.getByText('Physical vs Book & Claim')).toBeTruthy();
    expect(screen.getByText('Why Compliance is Not the Same as Credits')).toBeTruthy();
    expect(screen.getByText('How Scope 3 Emissions Are Claimed Safely')).toBeTruthy();
    expect(screen.getByText(/Energy Content Matters/)).toBeTruthy();
    expect(screen.getByText('FuelEU Maritime: What Fuel Buyers Need to Know')).toBeTruthy();
    const readLinks = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/education/'));
    expect(readLinks.length).toBe(6);
  });

  it('renders category filter tabs', () => {
    renderWithRouter(<EducationPage />);
    const buttons = screen.getAllByRole('button');
    const buttonLabels = buttons.map((b) => b.textContent);
    expect(buttonLabels).toContain('All');
    expect(buttonLabels).toContain('Fundamentals');
    expect(buttonLabels).toContain('Compliance');
    expect(buttonLabels).toContain('Market');
  });
});

/* ------------------------------------------------------------------ */
/*  EducationArticlePage (Individual)                                  */
/* ------------------------------------------------------------------ */

describe('EducationArticlePage', () => {
  it('renders article content when valid slug', () => {
    render(
      <MemoryRouter initialEntries={['/education/what-is-carbon-intensity']}>
        <Routes>
          <Route path="/education/:slug" element={<EducationArticlePage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('What is Carbon Intensity and Why It Matters')).toBeTruthy();
    expect(screen.getByText('Fundamentals')).toBeTruthy();
    expect(screen.getByText('4 min read')).toBeTruthy();
  });

  it('shows not found for invalid slug', () => {
    render(
      <MemoryRouter initialEntries={['/education/nonexistent-article']}>
        <Routes>
          <Route path="/education/:slug" element={<EducationArticlePage />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Article not found')).toBeTruthy();
    const backLink = screen.getByRole('link', { name: /back to education/i });
    expect(backLink.getAttribute('href')).toBe('/education');
  });
});

describe('education namespace cold start', () => {
  it('gates every public article consumer until education copy is loaded', async () => {
    await i18n.changeLanguage('en');
    const renderPages = [
      () => renderWithRouter(<EducationPage />),
      () => render(
        <MemoryRouter initialEntries={['/education/what-is-carbon-intensity']}>
          <Routes>
            <Route path="/education/:slug" element={<EducationArticlePage />} />
          </Routes>
        </MemoryRouter>
      ),
      () => renderWithRouter(<PartnersPage />),
    ];
    let view: ReturnType<typeof render> | undefined;

    try {
      for (const renderPage of renderPages) {
        i18n.removeResourceBundle('en', 'education');
        i18n.removeResourceBundle('zh', 'education');

        view = renderPage();
        expect(view.container.textContent).not.toContain('articles.');
        expect(await screen.findByText('What is Carbon Intensity and Why It Matters')).toBeTruthy();
        view.unmount();
        view = undefined;
      }
    } finally {
      view?.unmount();
      await loadNamespace('education');
    }
  });
});

describe('Chinese education categories', () => {
  it('localizes article badges and keeps a canonical partner filter through locale changes', async () => {
    await loadNamespace('public');
    await loadNamespace('education');
    await i18n.changeLanguage('zh');
    let view: ReturnType<typeof render> | undefined;

    try {
      view = render(
        <MemoryRouter initialEntries={['/education/what-is-carbon-intensity']}>
          <Routes>
            <Route path="/education/:slug" element={<EducationArticlePage />} />
          </Routes>
        </MemoryRouter>,
      );
      expect(await screen.findByText('基础知识')).toBeTruthy();
      expect(screen.queryByText('Fundamentals')).toBeNull();
      view.unmount();

      view = renderWithRouter(<PartnersPage />);
      fireEvent.click(await screen.findByRole('button', { name: '合规' }));
      expect(screen.getAllByRole('link').filter(link => link.getAttribute('href')?.startsWith('/education/'))).toHaveLength(3);

      await i18n.changeLanguage('en');
      const compliance = await screen.findByRole('button', { name: 'Compliance' });
      expect(compliance.style.border).toContain('2px');
      expect(screen.getAllByRole('link').filter(link => link.getAttribute('href')?.startsWith('/education/'))).toHaveLength(3);
    } finally {
      view?.unmount();
      await i18n.changeLanguage('en');
    }
  });
});
