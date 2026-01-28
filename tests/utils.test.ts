/**
 * Unit tests for utility functions.
 * These tests don't require any external services or mocking complex dependencies.
 */
import { describe, it, expect } from 'vitest';

// Simple utility function tests that don't depend on complex React/Leaflet imports
describe('Basic Tests', () => {
  it('should pass a sanity check', () => {
    expect(true).toBe(true);
  });

  it('should correctly add numbers', () => {
    expect(1 + 1).toBe(2);
  });
});

describe('Port ID Parsing', () => {
  it('should extract country code from port ID', () => {
    const portId = 'sg-sin';
    const countryCode = portId.split('-')[0];
    expect(countryCode).toBe('sg');
  });

  it('should extract port code from port ID', () => {
    const portId = 'nl-rtm';
    const portCode = portId.split('-')[1];
    expect(portCode).toBe('rtm');
  });
});

describe('Location Utilities', () => {
  it('should calculate distance between two points', () => {
    // Haversine formula approximation
    const toRadians = (deg: number) => deg * (Math.PI / 180);
    
    const haversineDistance = (
      lat1: number, lon1: number,
      lat2: number, lon2: number
    ): number => {
      const R = 6371; // Earth's radius in km
      const dLat = toRadians(lat2 - lat1);
      const dLon = toRadians(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Singapore to Rotterdam approximately 10,000 km
    const singapore = { lat: 1.264, lng: 103.822 };
    const rotterdam = { lat: 51.9225, lng: 4.4792 };
    
    const distance = haversineDistance(
      singapore.lat, singapore.lng,
      rotterdam.lat, rotterdam.lng
    );
    
    expect(distance).toBeGreaterThan(9000);
    expect(distance).toBeLessThan(11000);
  });
});

describe('Price Formatting', () => {
  const formatPrice = (price: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(price);
  };

  it('should format prices correctly', () => {
    expect(formatPrice(1234.56)).toBe('$1,234.56');
    expect(formatPrice(0)).toBe('$0.00');
    expect(formatPrice(1000000)).toBe('$1,000,000.00');
  });

  it('should handle negative prices', () => {
    expect(formatPrice(-50.25)).toBe('-$50.25');
  });
});

describe('Date Utilities', () => {
  const formatDateForAPI = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const isDateInFuture = (date: Date): boolean => {
    return date.getTime() > Date.now();
  };

  it('should format date for API', () => {
    const date = new Date('2026-03-15T12:00:00Z');
    expect(formatDateForAPI(date)).toBe('2026-03-15');
  });

  it('should detect future dates', () => {
    const futureDate = new Date(Date.now() + 86400000); // Tomorrow
    const pastDate = new Date(Date.now() - 86400000);   // Yesterday
    
    expect(isDateInFuture(futureDate)).toBe(true);
    expect(isDateInFuture(pastDate)).toBe(false);
  });
});

describe('API URL Construction', () => {
  const API_BASE = 'http://localhost:8000';
  
  const buildApiUrl = (endpoint: string, params?: Record<string, string>): string => {
    const url = new URL(endpoint, API_BASE);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  };

  it('should build simple API URLs', () => {
    expect(buildApiUrl('/api/auth/login')).toBe('http://localhost:8000/api/auth/login');
  });

  it('should build URLs with query params', () => {
    const url = buildApiUrl('/api/ports', { limit: '10', offset: '0' });
    expect(url).toContain('limit=10');
    expect(url).toContain('offset=0');
  });
});
