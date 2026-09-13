import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../../tests/test-utils';
import { MobilePilotCta, shouldShowMobilePilotCta } from '../MobilePilotCta';

describe('mobile pilot CTA', () => {
  it('shows only on known public information routes', () => {
    expect(shouldShowMobilePilotCta('/en')).toBe(true);
    expect(shouldShowMobilePilotCta('/zh/how-it-works')).toBe(true);
    expect(shouldShowMobilePilotCta('/en/fuels/maritime')).toBe(true);
    expect(shouldShowMobilePilotCta('/en/pilot')).toBe(false);
    expect(shouldShowMobilePilotCta('/en/privacy')).toBe(false);
    expect(shouldShowMobilePilotCta('/en/terms')).toBe(false);
    expect(shouldShowMobilePilotCta('/register')).toBe(false);
    expect(shouldShowMobilePilotCta('/thank-you')).toBe(false);
    expect(shouldShowMobilePilotCta('/en/not-a-real-page')).toBe(false);
    expect(shouldShowMobilePilotCta('/en/fuels/not-a-real-sector')).toBe(false);
    expect(shouldShowMobilePilotCta('/en/education/not-a-real-article')).toBe(false);
    expect(shouldShowMobilePilotCta('/app/home')).toBe(false);
  });

  it('matches the desktop primary action label and localized destination', () => {
    const view = renderWithProviders(<MobilePilotCta />, { route: '/en/how-it-works', path: '/:lang/*' });

    const link = view.container.querySelector('a');
    expect(link?.textContent).toContain('Apply for Pilot');
    expect(link?.getAttribute('href')).toBe('/en/pilot');
    expect(link?.closest('.public-mobile-cta')).toBeTruthy();
  });
});
