# Solar System 3D

Interactive solar system demo built with Astro and Three.js. Explore a 3D scene with animated planets, orbits, labels, click/tap selection and accessible controls.

## Features

- 3D solar system with the Sun, planets, orbits, Saturn's rings, the Moon and a star field.
- Elliptical orbits using each planet's real eccentricity and axial tilt (retrograde Venus, sideways Uranus).
- Asteroid belt between Mars and Jupiter rendered with `InstancedMesh`.
- Major moons: Earth's Moon, Jupiter's Galilean moons (Io, Europa, Ganymede, Callisto) and Saturn's Titan.
- Sun glow via **selective** layer-based bloom (two `EffectComposer` passes + `ShaderPass`): only the Sun blooms while the planets stay sharp.
- Real shadows (`shadowMap`): planets and moons cast and receive shadows, so moons can eclipse their planet.
- A comet on a long, eccentric, inclined orbit with a tail that always points away from the Sun.
- Toggleable **real-scale** mode: repositions the orbits proportionally to real distances (in AU) while keeping the bodies visible.
- **Date** control: places the planets at their approximate heliocentric position for a given day (J2000 mean longitudes and sidereal periods) plus a "Today" button.
- Guided tour that travels across the Sun and planets, focusing each one in turn.
- "Go to" selector in the toolbar to jump to any body, kept in sync with the current selection.
- "Share" button that copies a URL encoding the camera view and selected body in the hash (restored when the link is opened).
- Toggleable performance (FPS) panel, with no external dependencies.
- Camera controls with drag, zoom and reset.
- Pause/resume, adjustable speed and label/orbit toggles.
- Click or tap a planet to focus it and open a card with real data (diameter, moons, day, year, temperature). The card can be closed with its button or the Escape key.
- Intro overlay, loader, fallback when WebGL is unavailable and basic `prefers-reduced-motion` support.
- Responsive UI: on phones the secondary controls collapse into a "⋯" menu.
- Canvas-generated textures to differentiate planets without adding dependencies.

## Commands

```sh
pnpm install
pnpm dev
pnpm build
pnpm preview
pnpm test          # Vitest (data tests)
pnpm lint          # ESLint
pnpm format        # Prettier
```

Continuous integration on GitHub Actions (`.github/workflows/ci.yml`): install, lint, test and build on every push and pull request.

## Structure

```text
src/pages/index.astro            Main page and metadata
src/components/SolarSystem.astro UI, controls and styles
src/utils/solarSystem.ts         Three.js scene and interaction logic
src/data/planets.ts              Single source of truth (physics, facts, orbital data and comet)
src/data/planets.test.ts         Data integrity tests (Vitest)
public/textures/                 Textures used by Earth and the Moon
```

## A note on scale

By default the scale is artistic: distances and sizes are tuned so the system stays navigable on screen. The "Real scale" button repositions the orbits proportionally to real distances (in AU); planet sizes stay exaggerated so they remain visible. The date control and heliocentric longitude are educational approximations (the real orientation of each orbit is ignored).
