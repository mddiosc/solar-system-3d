import { describe, expect, it } from 'vitest';

import { ASTEROID_BELT, PLANETS, type BodyData } from './planets';

const bodies: BodyData[] = PLANETS;

describe('planet data', () => {
  it('defines the 8 planets with valid body fields', () => {
    expect(bodies).toHaveLength(8);

    for (const body of bodies) {
      expect(body.name.trim()).not.toBe('');
      expect(body.label.trim()).not.toBe('');
      expect(body.radius).toBeGreaterThan(0);
      expect(body.distance).toBeGreaterThan(0);
      expect(body.eccentricity).toBeGreaterThanOrEqual(0);
      expect(body.eccentricity).toBeLessThan(1);
    }
  });

  it('uses unique planet names', () => {
    expect(new Set(bodies.map((body) => body.name)).size).toBe(bodies.length);
  });

  it('keeps asteroid belt radii ordered', () => {
    expect(ASTEROID_BELT.innerRadius).toBeLessThan(ASTEROID_BELT.outerRadius);
  });

  it('defines valid moon data when present', () => {
    const moons = bodies.flatMap((body) => body.moons ?? []);

    expect(moons.length).toBeGreaterThan(0);
    for (const moon of moons) {
      expect(moon.name.trim()).not.toBe('');
      expect(moon.label.trim()).not.toBe('');
      expect(moon.radius).toBeGreaterThan(0);
      expect(moon.distance).toBeGreaterThan(0);
    }
  });
});
