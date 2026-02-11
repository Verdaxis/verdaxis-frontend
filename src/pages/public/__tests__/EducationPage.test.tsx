import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { EducationPage } from '../EducationPage';
import { EducationArticlePage } from '../EducationArticlePage';

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
    // Should have 6 "Read article" links
    const readLinks = screen.getAllByText(/Read article/);
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
