import { describe, it, expect } from 'vitest';
import { calculateDistance, isWithinRadius, formatDistance } from './geolocation';

// Check-in geofence math — this decides whether a check-in is valid,
// and a check-in carries XP + AFC, so wrong distance = wrong economy.

describe('calculateDistance (Haversine, meters)', () => {
  it('is ~0 for identical coordinates', () => {
    expect(calculateDistance(44.8125, 20.4612, 44.8125, 20.4612)).toBeCloseTo(0, 5);
  });

  it('is symmetric', () => {
    const a = calculateDistance(44.81, 20.46, 44.82, 20.47);
    const b = calculateDistance(44.82, 20.47, 44.81, 20.46);
    expect(a).toBeCloseTo(b, 6);
  });

  it('~111km per degree of latitude', () => {
    const d = calculateDistance(44.0, 20.0, 45.0, 20.0);
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });

  it('short Belgrade-scale hop is in the tens-to-hundreds of meters', () => {
    // ~0.001° lat ≈ 111m
    const d = calculateDistance(44.8125, 20.4612, 44.8135, 20.4612);
    expect(d).toBeGreaterThan(100);
    expect(d).toBeLessThan(120);
  });
});

describe('isWithinRadius', () => {
  const venue = { latitude: 44.8125, longitude: 20.4612 };

  it('true when standing on the venue', () => {
    expect(isWithinRadius({ latitude: 44.8125, longitude: 20.4612 }, venue, 100)).toBe(true);
  });

  it('false when ~220m away with a 100m radius', () => {
    expect(isWithinRadius({ latitude: 44.8145, longitude: 20.4612 }, venue, 100)).toBe(false);
  });

  it('respects a wider radius', () => {
    expect(isWithinRadius({ latitude: 44.8145, longitude: 20.4612 }, venue, 300)).toBe(true);
  });
});

describe('formatDistance', () => {
  it('rounds meters under 1km', () => {
    expect(formatDistance(42.6)).toBe('43m');
    expect(formatDistance(999)).toBe('999m');
  });
  it('switches to km with one decimal at 1000m+', () => {
    expect(formatDistance(1000)).toBe('1.0km');
    expect(formatDistance(2450)).toBe('2.5km');
  });
});
