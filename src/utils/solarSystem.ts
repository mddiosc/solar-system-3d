import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { t } from '../data/i18n';
import {
  ASTEROID_BELT,
  COMET,
  ORBITAL_DATA,
  PLANETS,
  SUN,
  type BodyData,
  type BodyFacts,
  type MoonData,
} from '../data/planets';

type PlanetOptions = BodyData;

type Planet = {
  mesh: THREE.Mesh;
  /** Container positioned along the orbit on every frame. */
  holder: THREE.Group;
  orbitLine?: THREE.LineLoop;
  options: BodyData;
  rotationSpeed: number;
  orbitSpeed: number;
  /** Current orbital angle in radians. */
  angle: number;
  /** Semi-major axis (X) of the elliptical orbit. */
  semiMajor: number;
  /** Semi-minor axis (Z) of the elliptical orbit. */
  semiMinor: number;
  /** Shift along X so the Sun sits at a focus of the ellipse. */
  focusOffset: number;
  cloudMesh?: THREE.Mesh;
  /** Each satellite with its own orbit pivot and angular speed. */
  moons: { orbit: THREE.Group; speed: number }[];
};

type PlanetDetail = { key: string; name: string; facts: BodyFacts };

/** A comet on a long, inclined, eccentric orbit with a Sun-facing tail. */
type Comet = {
  group: THREE.Group;
  /** Holds both particle tails; aligned so its +Y points away from the Sun. */
  tail: THREE.Object3D;
  angle: number;
  speed: number;
  semiMajor: number;
  semiMinor: number;
  focusOffset: number;
  inclination: number;
};

type SolarSystemEventMap = {
  ready: CustomEvent;
  select: CustomEvent<PlanetDetail>;
  tourend: CustomEvent;
  stats: CustomEvent<{ fps: number }>;
};

const BLOOM_LAYER = 1;

export class SolarSystem {
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly bloomComposer: EffectComposer;
  private readonly finalComposer: EffectComposer;
  private readonly bloomLayer = new THREE.Layers();
  private readonly darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
  private readonly savedMaterials = new Map<string, THREE.Material | THREE.Material[]>();
  private readonly controls: OrbitControls;
  private readonly textureLoader = new THREE.TextureLoader();
  private readonly planets: Planet[] = [];
  private readonly labels: HTMLDivElement[] = [];
  private readonly clock = new THREE.Clock();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private asteroidBelt?: THREE.InstancedMesh;
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private paused = false;
  private speed = 1;
  private labelsVisible = true;
  private orbitsVisible = true;
  private selected?: Planet;
  private focus?: {
    from: THREE.Vector3;
    to: THREE.Vector3;
    targetFrom: THREE.Vector3;
    targetTo: THREE.Vector3;
    started: number;
    duration: number;
  };
  private tour?: { index: number; nextAt: number };
  private statsFrames = 0;
  private statsSince = performance.now();
  private realScale = false;
  private comet?: Comet;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1200);
    this.camera.position.set(-18, 25, 62);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    // Real shadows so moons can eclipse their planets and planets cast shadows.
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.04;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 120;

    this.scene.background = new THREE.Color(0x01020a);

    // Selective bloom: only objects on BLOOM_LAYER (the Sun) glow. Everything else
    // is rendered black into the bloom pass so planets stay crisp and unaffected.
    this.bloomLayer.set(BLOOM_LAYER);

    const renderPass = new RenderPass(this.scene, this.camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 1.2, 0.5, 0);

    this.bloomComposer = new EffectComposer(this.renderer);
    this.bloomComposer.renderToScreen = false;
    this.bloomComposer.addPass(renderPass);
    this.bloomComposer.addPass(bloomPass);

    const mixPass = new ShaderPass(
      new THREE.ShaderMaterial({
        uniforms: {
          baseTexture: { value: null },
          bloomTexture: { value: this.bloomComposer.renderTarget2.texture },
        },
        vertexShader:
          'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader:
          'uniform sampler2D baseTexture; uniform sampler2D bloomTexture; varying vec2 vUv; void main() { gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv); }',
      }),
      'baseTexture'
    );
    mixPass.needsSwap = true;

    this.finalComposer = new EffectComposer(this.renderer);
    this.finalComposer.addPass(renderPass);
    this.finalComposer.addPass(mixPass);
    this.finalComposer.addPass(new OutputPass());

    this.addLights();
    this.addStars();
    this.addSolarBodies();
    this.addComet();

    this.resize();
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('pointerdown', this.selectFromPointer);
    this.renderer.setAnimationLoop(this.animate);
    this.canvas.dispatchEvent(new CustomEvent('ready'));
    queueMicrotask(() => this.applyStateFromHash());
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  setLabelsVisible(visible: boolean): void {
    this.labelsVisible = visible;
  }

  setOrbitsVisible(visible: boolean): void {
    this.orbitsVisible = visible;
    for (const planet of this.planets) if (planet.orbitLine) planet.orbitLine.visible = visible;
  }

  /** Strongly-typed event subscription for consumers of the instance. */
  addEventListener<K extends keyof SolarSystemEventMap>(
    type: K,
    listener: (event: SolarSystemEventMap[K]) => void
  ): void {
    this.canvas.addEventListener(type, listener as EventListener);
  }

  /**
   * Toggle between the artistic layout and an orbit layout proportional to the
   * real semi-major axes (in AU). Planet sizes stay exaggerated so they remain
   * visible; only orbital distances change. The camera range widens in real mode.
   */
  setRealScale(enabled: boolean): void {
    this.realScale = enabled;
    const factor = 14.5; // Earth (1 AU) keeps its artistic distance of 14.5 units.

    for (const planet of this.planets) {
      const data = ORBITAL_DATA[planet.options.name];
      if (!data) continue; // Sun (no orbit) and any body without real data.

      const semiMajor = enabled ? data.realDistanceAu * factor : planet.options.distance;
      const e = planet.options.eccentricity;
      planet.semiMajor = semiMajor;
      planet.semiMinor = semiMajor * Math.sqrt(1 - e ** 2);
      planet.focusOffset = semiMajor * e;
      this.rebuildOrbit(planet);
    }

    // Keep the belt roughly between Mars and Jupiter in both modes (~2.77 AU).
    if (this.asteroidBelt) this.asteroidBelt.scale.setScalar(enabled ? 1.84 : 1);
    this.controls.maxDistance = enabled ? 620 : 120;
    this.controls.update();
  }

  /**
   * Place every planet at its approximate heliocentric position for a given
   * date, using J2000 mean longitudes and sidereal periods. Positions are a
   * teaching approximation (orbit orientations are ignored). Pass null to keep
   * the current angles. Motion continues forward from the chosen date.
   */
  setDate(date: Date | null): void {
    if (!date || Number.isNaN(date.getTime())) return;
    const j2000 = Date.UTC(2000, 0, 1, 12);
    const days = (date.getTime() - j2000) / 86_400_000;

    for (const planet of this.planets) {
      const data = ORBITAL_DATA[planet.options.name];
      if (!data) continue;

      const turns = data.meanLongitude / 360 + days / data.periodDays;
      planet.angle = turns * Math.PI * 2;
      planet.holder.position.set(
        Math.cos(planet.angle) * planet.semiMajor - planet.focusOffset,
        0,
        Math.sin(planet.angle) * planet.semiMinor
      );
    }
  }

  resetCamera(): void {
    this.stopTour();
    this.selected = undefined;
    this.setFocus(new THREE.Vector3(-18, 25, 62), new THREE.Vector3(0, 0, 0));
  }

  startTour(): void {
    if (this.tour) return;
    this.tour = { index: 0, nextAt: performance.now() };
  }

  stopTour(): void {
    if (!this.tour) return;
    this.tour = undefined;
    this.canvas.dispatchEvent(new CustomEvent('tourend'));
  }

  /** Focus a body by its stable key (BodyData.name). Used by the toolbar selector. */
  focusByName(name: string): void {
    const planet = this.planets.find((item) => item.options.name === name);
    if (!planet) return;
    this.stopTour();
    this.focusPlanet(planet);
  }

  /** Clear the current selection (e.g. when the info card is closed). */
  clearSelection(): void {
    this.selected = undefined;
  }

  /** Build a shareable URL encoding the current camera framing and selection in the hash. */
  getShareUrl(): string {
    const round = (value: number): number => Number(value.toFixed(2));
    const p = this.camera.position;
    const t = this.controls.target;
    const parts = [`view=${round(p.x)},${round(p.y)},${round(p.z)},${round(t.x)},${round(t.y)},${round(t.z)}`];
    if (this.selected) parts.push(`sel=${this.selected.options.name}`);
    return `${window.location.origin}${window.location.pathname}#${parts.join('&')}`;
  }

  /** Restore camera framing and selection from the URL hash (deferred from the constructor). */
  private applyStateFromHash(): void {
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash) return;
    const params = new URLSearchParams(hash);

    const view = params.get('view');
    if (view) {
      const n = view.split(',').map(Number);
      if (n.length === 6 && n.every((value) => Number.isFinite(value))) {
        this.camera.position.set(n[0], n[1], n[2]);
        this.controls.target.set(n[3], n[4], n[5]);
        this.controls.update();
      }
    }

    const sel = params.get('sel');
    if (sel) {
      const planet = this.planets.find((item) => item.options.name === sel);
      if (planet) {
        this.selected = planet;
        this.canvas.dispatchEvent(new CustomEvent<PlanetDetail>('select', { detail: this.getPlanetDetail(planet) }));
      }
    }
  }

  dispose(): void {
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('pointerdown', this.selectFromPointer);
    this.renderer.setAnimationLoop(null);
    this.controls.dispose();
    this.bloomComposer.dispose();
    this.finalComposer.dispose();
    this.darkMaterial.dispose();
    this.renderer.dispose();

    this.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineLoop)) return;

      object.geometry.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];

      for (const material of materials) {
        for (const value of Object.values(material)) {
          if (value instanceof THREE.Texture) value.dispose();
        }

        material.dispose();
      }
    });

    for (const label of this.labels) label.remove();
  }

  private addLights(): void {
    const sunLight = new THREE.PointLight(0xffddaa, 2200, 360);
    // The Sun is the only shadow caster. PointLight shadows render a cube map,
    // so keep the map modest and bias tuned to avoid acne on the spheres.
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 220;
    sunLight.shadow.bias = -0.0006;
    sunLight.shadow.normalBias = 0.02;

    this.scene.add(
      sunLight,
      new THREE.AmbientLight(0x182340, 0.12),
      new THREE.HemisphereLight(0x4d6bff, 0x12070a, 0.16)
    );
  }

  private addStars(): void {
    const starCount = 4200;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const palette = [new THREE.Color(0xffffff), new THREE.Color(0x9bbcff), new THREE.Color(0xffd7a1)];

    for (let i = 0; i < starCount; i += 1) {
      const index = i * 3;
      const radius = THREE.MathUtils.randFloat(130, 650);
      const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
      const phi = Math.acos(THREE.MathUtils.randFloatSpread(2));
      const color = palette[i % palette.length];

      positions[index] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index + 1] = radius * Math.cos(phi);
      positions[index + 2] = radius * Math.sin(phi) * Math.sin(theta);
      colors[index] = color.r;
      colors[index + 1] = color.g;
      colors[index + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.scene.add(
      new THREE.Points(
        geometry,
        new THREE.PointsMaterial({
          size: 0.62,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.9,
          vertexColors: true,
        })
      )
    );
  }

  private addSolarBodies(): void {
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(SUN.radius, 64, 64),
      new THREE.MeshBasicMaterial({ map: this.createSunTexture() })
    );
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(SUN.radius * 1.2, 64, 64),
      new THREE.MeshBasicMaterial({
        color: 0xffb347,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.3,
        depthWrite: false,
      })
    );

    sun.add(glow);
    sun.layers.enable(BLOOM_LAYER);
    glow.layers.enable(BLOOM_LAYER);
    const holder = new THREE.Group();
    holder.add(sun);
    this.scene.add(holder);
    this.addLabel(t('Sun.label'), sun);
    this.planets.push({
      mesh: sun,
      holder,
      options: SUN,
      rotationSpeed: SUN.rotationSpeed,
      orbitSpeed: 0,
      angle: 0,
      semiMajor: 0,
      semiMinor: 0,
      focusOffset: 0,
      moons: [],
    });

    for (const planet of PLANETS) this.createPlanet(planet);
    this.addAsteroidBelt();
  }

  private createPlanet(options: PlanetOptions): void {
    const semiMajor = options.distance;
    const semiMinor = options.distance * Math.sqrt(1 - options.eccentricity ** 2);
    const focusOffset = semiMajor * options.eccentricity;

    const holder = new THREE.Group();
    const tilt = new THREE.Group();
    tilt.rotation.z = options.axialTilt;

    const mesh = new THREE.Mesh(new THREE.SphereGeometry(options.radius, 64, 64), this.createPlanetMaterial(options));

    mesh.name = options.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    tilt.add(mesh);
    holder.add(tilt);

    const orbitLine = this.createOrbitLine(semiMajor, semiMinor, focusOffset);
    this.scene.add(orbitLine, holder);
    this.addLabel(t(`${options.name}.label`), mesh);

    const cloudMesh = options.hasClouds ? this.createCloudLayer(options) : undefined;
    if (cloudMesh) mesh.add(cloudMesh);

    if (options.hasRings) mesh.add(this.createSaturnRings(options.radius));
    const moons = options.moons ? this.addMoons(tilt, options.moons) : [];

    const angle = Math.random() * Math.PI * 2;
    holder.position.set(Math.cos(angle) * semiMajor - focusOffset, 0, Math.sin(angle) * semiMinor);

    this.planets.push({
      mesh,
      holder,
      orbitLine,
      options,
      rotationSpeed: options.rotationSpeed,
      orbitSpeed: options.orbitSpeed,
      angle,
      semiMajor,
      semiMinor,
      focusOffset,
      cloudMesh,
      moons,
    });
  }

  private addMoons(parent: THREE.Object3D, moons: MoonData[]): { orbit: THREE.Group; speed: number }[] {
    return moons.map((data) => {
      const orbit = new THREE.Group();
      const material = data.texture
        ? new THREE.MeshStandardMaterial({ map: this.loadTexture(data.texture), roughness: 0.9 })
        : new THREE.MeshStandardMaterial({ color: data.color, roughness: 0.85, metalness: 0 });
      const moon = new THREE.Mesh(new THREE.SphereGeometry(data.radius, 32, 32), material);

      moon.name = data.name;
      moon.castShadow = true;
      moon.receiveShadow = true;
      moon.position.x = data.distance;
      orbit.rotation.y = Math.random() * Math.PI * 2;
      orbit.add(moon);
      parent.add(orbit);
      return { orbit, speed: data.orbitSpeed };
    });
  }

  private addAsteroidBelt(): void {
    const { count, innerRadius, outerRadius, thickness, minSize, maxSize } = ASTEROID_BELT;
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({ color: 0x8a7c6a, roughness: 1, metalness: 0, flatShading: true });
    const belt = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = THREE.MathUtils.randFloat(innerRadius, outerRadius);
      const size = THREE.MathUtils.randFloat(minSize, maxSize);

      dummy.position.set(
        Math.cos(angle) * radius,
        THREE.MathUtils.randFloatSpread(thickness),
        Math.sin(angle) * radius
      );
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.scale.setScalar(size);
      dummy.updateMatrix();
      belt.setMatrixAt(i, dummy.matrix);
    }

    belt.instanceMatrix.needsUpdate = true;
    this.asteroidBelt = belt;
    this.scene.add(belt);
  }

  private createOrbitLine(semiMajor: number, semiMinor: number, focusOffset: number): THREE.LineLoop {
    const points = Array.from({ length: 192 }, (_, i) => {
      const angle = (i / 192) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(angle) * semiMajor - focusOffset, 0, Math.sin(angle) * semiMinor);
    });

    return new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0x31456c, transparent: true, opacity: 0.34 })
    );
  }

  /** Regenerate a planet's orbit line after its ellipse changed (real-scale toggle). */
  private rebuildOrbit(planet: Planet): void {
    if (!planet.orbitLine) return;
    const points = Array.from({ length: 192 }, (_, i) => {
      const angle = (i / 192) * Math.PI * 2;
      return new THREE.Vector3(
        Math.cos(angle) * planet.semiMajor - planet.focusOffset,
        0,
        Math.sin(angle) * planet.semiMinor
      );
    });
    planet.orbitLine.geometry.dispose();
    planet.orbitLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
  }

  /** Soft radial sprite (white core fading to transparent) used by comet particles. */
  private createSoftSprite(): THREE.CanvasTexture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.55)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * Build a wispy particle tail laid along -Y (away from Sun once oriented).
   * Particles spread wider and dim toward the far end; `curve` bends the stream
   * sideways to differentiate the straight ion tail from the dusty one.
   */
  private createCometTail(options: {
    sprite: THREE.CanvasTexture;
    count: number;
    length: number;
    spread: number;
    curve: number;
    size: number;
    color: THREE.Color;
  }): THREE.Points {
    const { sprite, count, length, spread, curve, size, color } = options;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // Bias particles toward the nucleus so the tail looks denser at its root.
      const t = Math.pow(Math.random(), 1.7);
      const along = t * length;
      const radius = spread * (0.15 + t) * Math.sqrt(Math.random());
      const theta = Math.random() * Math.PI * 2;

      positions[i * 3] = Math.cos(theta) * radius + curve * t * t * length;
      positions[i * 3 + 1] = -along;
      positions[i * 3 + 2] = Math.sin(theta) * radius;

      // Fade brightness from the nucleus (bright) to the tip (near zero).
      const fade = Math.pow(1 - t, 1.4);
      colors[i * 3] = color.r * fade;
      colors[i * 3 + 1] = color.g * fade;
      colors[i * 3 + 2] = color.b * fade;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size,
      map: sprite,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    return new THREE.Points(geometry, material);
  }

  private addComet(): void {
    const group = new THREE.Group();
    const sprite = this.createSoftSprite();

    // Bright icy nucleus — joins the bloom layer so it glows like the Sun bodies.
    const nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(COMET.radius, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0xeaf6ff, emissive: 0x8fc8ff, emissiveIntensity: 1.4, roughness: 0.4 })
    );
    nucleus.layers.enable(BLOOM_LAYER);

    // Diffuse glowing coma around the nucleus (billboarded sprite).
    const coma = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: sprite,
        color: 0xbfe6ff,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    coma.scale.setScalar(COMET.radius * 6);
    coma.layers.enable(BLOOM_LAYER);

    // Two tails grouped together so a single quaternion orients both away from Sun.
    const tail = new THREE.Group();
    const ionTail = this.createCometTail({
      sprite,
      count: 900,
      length: 11,
      spread: 0.35,
      curve: 0,
      size: 0.5,
      color: new THREE.Color(0x7fb8ff),
    });
    const dustTail = this.createCometTail({
      sprite,
      count: 700,
      length: 8,
      spread: 0.9,
      curve: 0.28,
      size: 0.75,
      color: new THREE.Color(0xffe6b0),
    });
    tail.add(ionTail, dustTail);

    group.add(tail, nucleus, coma);
    this.scene.add(group);

    const semiMajor = COMET.semiMajor;
    const semiMinor = semiMajor * Math.sqrt(1 - COMET.eccentricity ** 2);
    this.comet = {
      group,
      tail,
      angle: Math.random() * Math.PI * 2,
      speed: COMET.orbitSpeed,
      semiMajor,
      semiMinor,
      focusOffset: semiMajor * COMET.eccentricity,
      inclination: COMET.inclination,
    };
  }

  private updateComet(motion: number): void {
    const comet = this.comet;
    if (!comet) return;

    comet.angle += motion * comet.speed;
    const x = Math.cos(comet.angle) * comet.semiMajor - comet.focusOffset;
    const planar = Math.sin(comet.angle) * comet.semiMinor;
    // Tilt the orbital plane around the X axis by the inclination.
    comet.group.position.set(x, planar * Math.sin(comet.inclination), planar * Math.cos(comet.inclination));

    // Point the tails away from the Sun: align their local +Y toward the Sun so
    // the particles (laid along -Y) stream outward into deep space.
    const towardSun = comet.group.position.clone().multiplyScalar(-1).normalize();
    comet.tail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), towardSun);
  }

  private createPlanetMaterial(options: PlanetOptions): THREE.MeshStandardMaterial {
    if (options.name === 'Earth') {
      return new THREE.MeshStandardMaterial({
        map: this.loadTexture('/textures/earth_day_4096.jpg'),
        normalMap: this.loadTexture('/textures/earth_normal_2048.jpg'),
        roughnessMap: this.loadTexture('/textures/earth_specular_2048.jpg'),
        roughness: 0.58,
        metalness: 0.02,
      });
    }

    return new THREE.MeshStandardMaterial({
      map: this.createPlanetTexture(options),
      bumpMap: this.createBumpTexture(options),
      bumpScale: options.texture === 'gas' || options.texture === 'ice' || options.texture === 'venus' ? 0.025 : 0.08,
      roughness: options.texture === 'ice' ? 0.55 : options.texture === 'gas' ? 0.72 : 0.9,
      metalness: 0,
      emissive: new THREE.Color(
        options.texture === 'ice' ? 0x061329 : options.texture === 'venus' ? 0x1c1004 : 0x000000
      ),
      emissiveIntensity: options.texture === 'ice' || options.texture === 'venus' ? 0.08 : 0,
    });
  }

  private createPlanetTexture(options: PlanetOptions): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 384;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');

    const [base, accent, dark] = options.colors.map((color) => `#${color.toString(16).padStart(6, '0')}`);
    context.fillStyle = base;
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (options.texture === 'gas' || options.texture === 'ice' || options.texture === 'venus') {
      this.paintBands(
        context,
        canvas,
        [base, accent, dark],
        options.name === 'Jupiter' ? 58 : options.texture === 'gas' ? 38 : 24
      );
      if (options.texture === 'ice') this.paintIceGlow(context, canvas, accent);
      if (options.texture === 'venus') this.paintVenusClouds(context, canvas);
    } else if (options.texture === 'earth') {
      this.paintEarth(context, canvas, base, accent, dark);
    } else {
      this.paintRock(context, canvas, accent, dark, options.texture === 'mars' ? 120 : 80);
    }

    if (options.name === 'Jupiter') this.paintJupiterSpot(context, canvas);
    if (options.name === 'Mars') this.paintMarsCaps(context, canvas);
    this.paintTextureNoise(context, canvas, options.texture === 'gas' ? 0.05 : 0.09);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    return texture;
  }

  private paintBands(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    colors: string[],
    count: number
  ): void {
    for (let i = 0; i < count; i += 1) {
      const y = (i / count) * canvas.height;
      context.fillStyle = colors[i % colors.length];
      context.globalAlpha = THREE.MathUtils.randFloat(0.26, 0.72);
      context.beginPath();
      context.moveTo(0, y);
      for (let x = 0; x <= canvas.width; x += 96) {
        context.lineTo(x, y + Math.sin(x * 0.018 + i) * THREE.MathUtils.randFloat(2, 9));
      }
      context.lineTo(canvas.width, y + THREE.MathUtils.randInt(5, 18));
      context.lineTo(0, y + THREE.MathUtils.randInt(5, 18));
      context.fill();
    }

    context.globalAlpha = 1;
  }

  private paintEarth(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    ocean: string,
    land: string,
    ice: string
  ): void {
    context.fillStyle = ocean;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = land;

    for (let i = 0; i < 18; i += 1) {
      context.beginPath();
      const x = THREE.MathUtils.randInt(0, canvas.width);
      const y = THREE.MathUtils.randInt(70, canvas.height - 70);
      context.ellipse(
        x,
        y,
        THREE.MathUtils.randInt(24, 105),
        THREE.MathUtils.randInt(12, 42),
        THREE.MathUtils.randFloat(0, Math.PI),
        0,
        Math.PI * 2
      );
      context.fill();
    }

    context.fillStyle = ice;
    context.fillRect(0, 0, canvas.width, 34);
    context.fillRect(0, canvas.height - 34, canvas.width, 34);
  }

  private paintRock(
    context: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    light: string,
    dark: string,
    count: number
  ): void {
    for (let i = 0; i < count; i += 1) {
      context.fillStyle = i % 3 === 0 ? dark : light;
      context.globalAlpha = THREE.MathUtils.randFloat(0.12, 0.46);
      context.beginPath();
      context.ellipse(
        THREE.MathUtils.randInt(0, canvas.width),
        THREE.MathUtils.randInt(0, canvas.height),
        THREE.MathUtils.randInt(3, 32),
        THREE.MathUtils.randInt(3, 22),
        0,
        0,
        Math.PI * 2
      );
      context.fill();
    }

    context.globalAlpha = 1;
  }

  private paintJupiterSpot(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    const gradient = context.createRadialGradient(
      canvas.width * 0.68,
      canvas.height * 0.56,
      8,
      canvas.width * 0.68,
      canvas.height * 0.56,
      70
    );
    gradient.addColorStop(0, 'rgba(238, 151, 101, 0.9)');
    gradient.addColorStop(0.55, 'rgba(164, 59, 35, 0.8)');
    gradient.addColorStop(1, 'rgba(88, 36, 28, 0.1)');
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(canvas.width * 0.68, canvas.height * 0.56, 62, 28, -0.12, 0, Math.PI * 2);
    context.fill();
  }

  private paintVenusClouds(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    context.strokeStyle = 'rgba(255, 238, 188, 0.34)';
    for (let i = 0; i < 34; i += 1) {
      const y = THREE.MathUtils.randInt(20, canvas.height - 20);
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(180, y - 36, 420, y + 42, canvas.width, y - 8);
      context.stroke();
    }
  }

  private paintMarsCaps(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    context.fillStyle = 'rgba(255, 224, 188, 0.75)';
    context.fillRect(0, 0, canvas.width, 18);
    context.fillRect(0, canvas.height - 18, canvas.width, 18);
  }

  private paintTextureNoise(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, alpha: number): void {
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < image.data.length; i += 4) {
      const noise = THREE.MathUtils.randInt(-18, 18) * alpha;
      image.data[i] += noise;
      image.data[i + 1] += noise;
      image.data[i + 2] += noise;
    }
    context.putImageData(image, 0, 0);
  }

  private createBumpTexture(options: PlanetOptions): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 384;
    canvas.height = 192;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');

    context.fillStyle = '#808080';
    context.fillRect(0, 0, canvas.width, canvas.height);

    if (options.texture === 'gas' || options.texture === 'ice' || options.texture === 'venus') {
      this.paintBands(context, canvas, ['#777', '#999', '#6d6d6d'], options.name === 'Jupiter' ? 50 : 26);
    } else {
      this.paintRock(context, canvas, '#aaa', '#555', options.texture === 'mars' ? 160 : 100);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.NoColorSpace;
    texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    return texture;
  }

  private paintIceGlow(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement, color: string): void {
    const gradient = context.createRadialGradient(
      canvas.width * 0.35,
      canvas.height * 0.42,
      20,
      canvas.width * 0.4,
      canvas.height * 0.44,
      canvas.width * 0.52
    );
    gradient.addColorStop(0, `${color}88`);
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  private createSunTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 384;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');

    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#fff4b0');
    gradient.addColorStop(0.45, '#ff9f1c');
    gradient.addColorStop(1, '#c92a0e');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 220; i += 1) {
      context.strokeStyle = `rgba(255, ${THREE.MathUtils.randInt(140, 235)}, 35, 0.34)`;
      context.lineWidth = THREE.MathUtils.randFloat(1, 6);
      context.beginPath();
      context.moveTo(0, THREE.MathUtils.randInt(0, canvas.height));
      context.bezierCurveTo(
        190,
        THREE.MathUtils.randInt(0, canvas.height),
        470,
        THREE.MathUtils.randInt(0, canvas.height),
        canvas.width,
        THREE.MathUtils.randInt(0, canvas.height)
      );
      context.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createCloudLayer(options: PlanetOptions): THREE.Mesh {
    return new THREE.Mesh(
      new THREE.SphereGeometry(options.radius * 1.035, 48, 48),
      new THREE.MeshStandardMaterial({
        map:
          options.name === 'Earth'
            ? this.loadTexture('/textures/earth_clouds_1024.png')
            : this.createCloudTexture(0xd8ad62),
        transparent: true,
        opacity: options.name === 'Earth' ? 0.42 : 0.36,
        depthWrite: false,
      })
    );
  }

  private createCloudTexture(color: number): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 384;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;

    for (let i = 0; i < 150; i += 1) {
      context.globalAlpha = THREE.MathUtils.randFloat(0.18, 0.65);
      context.beginPath();
      context.ellipse(
        THREE.MathUtils.randInt(0, canvas.width),
        THREE.MathUtils.randInt(0, canvas.height),
        THREE.MathUtils.randInt(12, 82),
        THREE.MathUtils.randInt(3, 18),
        THREE.MathUtils.randFloat(0, Math.PI),
        0,
        Math.PI * 2
      );
      context.fill();
    }

    context.globalAlpha = 1;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private createSaturnRings(radius: number): THREE.Mesh {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(radius * 1.45, radius * 2.45, 128),
      new THREE.MeshBasicMaterial({
        map: this.createRingTexture(),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.82,
      })
    );

    ring.rotation.x = Math.PI * 0.5;
    ring.rotation.y = Math.PI * 0.08;
    return ring;
  }

  private createRingTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 16;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');

    for (let x = 0; x < canvas.width; x += 1) {
      context.fillStyle = x % 19 < 3 ? 'rgba(90, 78, 54, 0.18)' : 'rgba(232, 211, 162, 0.78)';
      context.fillRect(x, 0, 1, canvas.height);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  private loadTexture(path: string): THREE.Texture {
    const texture = this.textureLoader.load(path);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    return texture;
  }

  private addLabel(text: string, mesh: THREE.Mesh): void {
    const label = document.createElement('div');
    label.className = 'solar-label';
    label.textContent = text;
    this.canvas.parentElement?.append(label);
    this.labels.push(label);
    mesh.userData.label = label;
  }

  private resize = (): void => {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    const ratio = Math.min(window.devicePixelRatio, 2);
    this.bloomComposer.setPixelRatio(ratio);
    this.bloomComposer.setSize(width, height);
    this.finalComposer.setPixelRatio(ratio);
    this.finalComposer.setSize(width, height);
  };

  private animate = (): void => {
    const delta = this.clock.getDelta();

    const motion = this.paused || this.reducedMotion ? 0 : delta * this.speed;

    for (const planet of this.planets) {
      planet.mesh.rotation.y += motion * planet.rotationSpeed;

      if (planet.orbitSpeed) {
        planet.angle += motion * planet.orbitSpeed;
        planet.holder.position.set(
          Math.cos(planet.angle) * planet.semiMajor - planet.focusOffset,
          0,
          Math.sin(planet.angle) * planet.semiMinor
        );
      }

      planet.cloudMesh?.rotateY(motion * 0.22);
      for (const moon of planet.moons) moon.orbit.rotateY(motion * moon.speed);
    }

    if (this.asteroidBelt) this.asteroidBelt.rotation.y += motion * 0.05;
    this.updateComet(motion);

    this.updateTour();
    this.updateFocus();
    this.controls.update();

    // Pass 1: render only the Sun's glow (everything else blacked out) into the bloom buffer.
    this.scene.traverse(this.darkenNonBloomed);
    this.bloomComposer.render();
    this.scene.traverse(this.restoreMaterial);
    // Pass 2: render the full scene and additively mix the bloom buffer on top.
    this.finalComposer.render();

    this.updateLabels();

    this.statsFrames += 1;
    const statsElapsed = performance.now() - this.statsSince;
    if (statsElapsed >= 500) {
      const fps = Math.round((this.statsFrames * 1000) / statsElapsed);
      this.canvas.dispatchEvent(new CustomEvent('stats', { detail: { fps } }));
      this.statsFrames = 0;
      this.statsSince = performance.now();
    }
  };

  private darkenNonBloomed = (object: THREE.Object3D): void => {
    const renderable = object as THREE.Mesh & THREE.Points;
    if ((renderable.isMesh || renderable.isPoints) && this.bloomLayer.test(object.layers) === false) {
      this.savedMaterials.set(object.uuid, renderable.material);
      renderable.material = this.darkMaterial;
    }
  };

  private restoreMaterial = (object: THREE.Object3D): void => {
    const saved = this.savedMaterials.get(object.uuid);
    if (saved) {
      (object as THREE.Mesh).material = saved;
      this.savedMaterials.delete(object.uuid);
    }
  };

  private updateLabels(): void {
    const position = new THREE.Vector3();

    for (const planet of this.planets) {
      const label = planet.mesh.userData.label as HTMLDivElement | undefined;
      if (!label) continue;

      planet.mesh.getWorldPosition(position);
      const distance = position.distanceTo(this.camera.position);
      position.project(this.camera);

      const x = (position.x * 0.5 + 0.5) * this.canvas.clientWidth;
      const y = (-position.y * 0.5 + 0.5) * this.canvas.clientHeight;
      const selected = planet === this.selected;
      label.classList.toggle('is-selected', selected);
      label.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
      label.style.opacity =
        !this.labelsVisible || position.z > 1
          ? '0'
          : String(selected ? 1 : THREE.MathUtils.clamp(1.1 - distance / 82, 0.22, 0.82));
    }
  }

  private selectFromPointer = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    const hit = this.raycaster.intersectObjects(
      this.planets.map((planet) => planet.mesh),
      false
    )[0];
    const planet = this.planets.find((item) => item.mesh === hit?.object);
    if (!planet) return;

    this.stopTour();
    this.focusPlanet(planet);
  };

  private focusPlanet(planet: Planet): void {
    this.selected = planet;
    const world = new THREE.Vector3();
    planet.mesh.getWorldPosition(world);
    const direction = new THREE.Vector3().subVectors(this.camera.position, world).normalize();
    const fallback = new THREE.Vector3(-0.55, 0.42, 1).normalize();
    const to = world
      .clone()
      .add((direction.lengthSq() ? direction : fallback).multiplyScalar(Math.max(planet.options.radius * 6, 7)));

    this.setFocus(to, world);
    this.canvas.dispatchEvent(new CustomEvent<PlanetDetail>('select', { detail: this.getPlanetDetail(planet) }));
  }

  private updateTour(): void {
    if (!this.tour) return;
    const now = performance.now();
    if (now < this.tour.nextAt) return;

    if (this.tour.index >= this.planets.length) {
      this.stopTour();
      return;
    }

    this.focusPlanet(this.planets[this.tour.index]);
    this.tour.index += 1;
    this.tour.nextAt = now + 3600;
  }

  private setFocus(to: THREE.Vector3, targetTo: THREE.Vector3): void {
    this.focus = {
      from: this.camera.position.clone(),
      to,
      targetFrom: this.controls.target.clone(),
      targetTo,
      started: performance.now(),
      duration: this.reducedMotion ? 1 : 850,
    };
  }

  private updateFocus(): void {
    if (!this.focus) return;
    const t = THREE.MathUtils.clamp((performance.now() - this.focus.started) / this.focus.duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    this.camera.position.lerpVectors(this.focus.from, this.focus.to, eased);
    this.controls.target.lerpVectors(this.focus.targetFrom, this.focus.targetTo, eased);
    if (t >= 1) this.focus = undefined;
  }

  private getPlanetDetail(planet: Planet): PlanetDetail {
    const name = planet.options.name;
    return {
      key: name,
      name: t(`${name}.label`),
      facts: {
        type: t(`${name}.type`),
        diameter: planet.options.facts.diameter,
        moons: t(`${name}.moons`),
        day: t(`${name}.day`),
        year: t(`${name}.year`),
        temp: t(`${name}.temp`),
        note: t(`${name}.note`),
      },
    };
  }

  updateLang(): void {
    for (const planet of this.planets) {
      const label = planet.mesh.userData.label as HTMLDivElement | undefined;
      if (label) label.textContent = t(`${planet.options.name}.label`);
    }
    if (this.selected) {
      this.canvas.dispatchEvent(
        new CustomEvent<PlanetDetail>('select', { detail: this.getPlanetDetail(this.selected) })
      );
    }
  }
}
