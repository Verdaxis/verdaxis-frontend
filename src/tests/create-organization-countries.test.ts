import { describe, expect, it } from 'vitest';

import { getAvailableCountries } from '../pages/CreateOrganizationPage';

describe('organization country selector', () => {
  it('includes Estonia and broad ISO country coverage', () => {
    const countries = getAvailableCountries('en');

    expect(countries.some(country => country.code === 'EE' && country.name === 'Estonia')).toBe(true);
    expect(countries.length).toBeGreaterThan(190);
  });

  it('uses localized country labels when Intl region names are available', () => {
    if (typeof Intl.DisplayNames !== 'function') return;

    const countries = getAvailableCountries('zh-CN');
    const estonia = countries.find(country => country.code === 'EE');

    expect(estonia).toBeDefined();
    expect(estonia?.name).not.toBe('Estonia');
  });
});
