export type Lang = 'en' | 'es';

const LANG_KEY = 'solar-lang';

export function getLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === 'en' || stored === 'es') return stored;
  } catch {}
  return navigator.language.startsWith('es') ? 'es' : 'en';
}

export function setLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {}
}

export function t(key: string): string {
  const lang = getLang();
  return dict[lang][key] ?? dict.en[key] ?? key;
}

const dict: Record<Lang, Record<string, string>> = {
  en: {
    'ui.loader': 'Preparing orbits…',
    'ui.intro.kicker': 'Orbital observatory',
    'ui.intro.title': 'Solar System 3D',
    'ui.intro.hint': 'Drag to orbit, pinch or scroll to zoom in. Tap a planet to focus it.',
    'ui.intro.explore': 'Explore',
    'ui.fallback':
      'Your browser does not have WebGL enabled. Try another browser or enable hardware acceleration to view the 3D solar system.',
    'ui.pause': 'Pause',
    'ui.resume': 'Resume',
    'ui.speed': 'Speed',
    'ui.goto': 'Go to',
    'ui.date': 'Date',
    'ui.today': 'Today',
    'ui.reset': 'Reset',
    'ui.tour': 'Tour',
    'ui.stop': 'Stop',
    'ui.labels': 'Labels',
    'ui.orbits': 'Orbits',
    'ui.realScale': 'Real scale',
    'ui.share': 'Share',
    'ui.copied': 'Copied!',
    'ui.urlReady': 'URL ready',
    'ui.performance': 'Performance',
    'ui.diameter': 'Diameter',
    'ui.moons': 'Moons',
    'ui.day': 'Day',
    'ui.year': 'Year',
    'ui.temperature': 'Temperature',
    'ui.close': 'Close panel',
    'ui.more': 'More controls',
    'ui.title': 'Solar System 3D',
    'ui.description': 'Interactive 3D solar system built with Astro and Three.js',

    'Sun.label': 'Sun',
    'Sun.type': 'Star',
    'Sun.moons': '8 planets',
    'Sun.day': '~25 days (equator)',
    'Sun.year': 'Center of the system',
    'Sun.temp': '~5,500 °C (surface)',
    'Sun.note': 'The light source and visual scale reference for the whole scene.',

    'Mercury.label': 'Mercury',
    'Mercury.type': 'Rocky',
    'Mercury.moons': 'None',
    'Mercury.day': '1,408 h',
    'Mercury.year': '88 days',
    'Mercury.temp': '−173 to 427 °C',
    'Mercury.note': 'Small, fast and cratered. The most eccentric orbit.',

    'Venus.label': 'Venus',
    'Venus.type': 'Cloudy rocky',
    'Venus.moons': 'None',
    'Venus.day': '5,832 h (retrograde)',
    'Venus.year': '225 days',
    'Venus.temp': '~464 °C',
    'Venus.note': 'Dense golden atmosphere. Spins backwards and very slowly.',

    'Earth.label': 'Earth',
    'Earth.type': 'Ocean world',
    'Earth.moons': '1 (the Moon)',
    'Earth.day': '24 h',
    'Earth.year': '365 days',
    'Earth.temp': '~15 °C (average)',
    'Earth.note': 'The only known world with liquid water and life.',

    'Mars.label': 'Mars',
    'Mars.type': 'Rocky',
    'Mars.moons': '2 (Phobos and Deimos)',
    'Mars.day': '24.6 h',
    'Mars.year': '687 days',
    'Mars.temp': '~−63 °C (average)',
    'Mars.note': 'Rust tones and polar ice caps.',

    'Jupiter.label': 'Jupiter',
    'Jupiter.type': 'Gas giant',
    'Jupiter.moons': '95 known',
    'Jupiter.day': '9.9 h',
    'Jupiter.year': '11.9 years',
    'Jupiter.temp': '~−108 °C',
    'Jupiter.note': 'The largest planet. Turbulent bands and the Great Red Spot.',

    'Saturn.label': 'Saturn',
    'Saturn.type': 'Gas giant',
    'Saturn.moons': '146 known',
    'Saturn.day': '10.7 h',
    'Saturn.year': '29.5 years',
    'Saturn.temp': '~−138 °C',
    'Saturn.note': 'Famous for its system of ice and rock rings.',

    'Uranus.label': 'Uranus',
    'Uranus.type': 'Ice giant',
    'Uranus.moons': '28 known',
    'Uranus.day': '17.2 h',
    'Uranus.year': '84 years',
    'Uranus.temp': '~−195 °C',
    'Uranus.note': 'Spins almost on its side: it rolls instead of spinning.',

    'Neptune.label': 'Neptune',
    'Neptune.type': 'Ice giant',
    'Neptune.moons': '16 known',
    'Neptune.day': '16.1 h',
    'Neptune.year': '165 years',
    'Neptune.temp': '~−201 °C',
    'Neptune.note': 'The farthest and windiest, with the fastest winds in the system.',

    'Comet.label': 'Comet',
    'Comet.type': 'Comet',
    'Comet.moons': 'None',
    'Comet.day': '—',
    'Comet.year': 'Highly elliptical orbit',
    'Comet.temp': 'Varies with distance to the Sun',
    'Comet.note': 'Its gas and dust tail always points away from the Sun.',
  },

  es: {
    'ui.loader': 'Preparando órbitas…',
    'ui.intro.kicker': 'Observatorio orbital',
    'ui.intro.title': 'Sistema Solar 3D',
    'ui.intro.hint': 'Arrastra para orbitar, pellizca o desplaza para acercar. Toca un planeta para enfocarlo.',
    'ui.intro.explore': 'Explorar',
    'ui.fallback':
      'Tu navegador no tiene WebGL habilitado. Prueba otro navegador o habilita la aceleración de hardware para ver el sistema solar 3D.',
    'ui.pause': 'Pausar',
    'ui.resume': 'Reanudar',
    'ui.speed': 'Velocidad',
    'ui.goto': 'Ir a',
    'ui.date': 'Fecha',
    'ui.today': 'Hoy',
    'ui.reset': 'Reset',
    'ui.tour': 'Recorrido',
    'ui.stop': 'Parar',
    'ui.labels': 'Etiquetas',
    'ui.orbits': 'Órbitas',
    'ui.realScale': 'Escala real',
    'ui.share': 'Compartir',
    'ui.copied': '¡Copiado!',
    'ui.urlReady': 'URL lista',
    'ui.performance': 'Rendimiento',
    'ui.diameter': 'Diámetro',
    'ui.moons': 'Lunas',
    'ui.day': 'Día',
    'ui.year': 'Año',
    'ui.temperature': 'Temperatura',
    'ui.close': 'Cerrar panel',
    'ui.more': 'Más controles',
    'ui.title': 'Sistema Solar 3D',
    'ui.description': 'Sistema solar 3D interactivo creado con Astro y Three.js',

    'Sun.label': 'Sol',
    'Sun.type': 'Estrella',
    'Sun.moons': '8 planetas',
    'Sun.day': '~25 días (ecuador)',
    'Sun.year': 'Centro del sistema',
    'Sun.temp': '~5.500 °C (superficie)',
    'Sun.note': 'La fuente de luz y referencia de escala visual de toda la escena.',

    'Mercury.label': 'Mercurio',
    'Mercury.type': 'Rocoso',
    'Mercury.moons': 'Ninguna',
    'Mercury.day': '1.408 h',
    'Mercury.year': '88 días',
    'Mercury.temp': '−173 a 427 °C',
    'Mercury.note': 'Pequeño, rápido y craterizado. La órbita más excéntrica.',

    'Venus.label': 'Venus',
    'Venus.type': 'Rocoso nublado',
    'Venus.moons': 'Ninguna',
    'Venus.day': '5.832 h (retrógrado)',
    'Venus.year': '225 días',
    'Venus.temp': '~464 °C',
    'Venus.note': 'Densa atmósfera dorada. Gira al revés y muy lentamente.',

    'Earth.label': 'Tierra',
    'Earth.type': 'Mundo oceánico',
    'Earth.moons': '1 (la Luna)',
    'Earth.day': '24 h',
    'Earth.year': '365 días',
    'Earth.temp': '~15 °C (promedio)',
    'Earth.note': 'El único mundo conocido con agua líquida y vida.',

    'Mars.label': 'Marte',
    'Mars.type': 'Rocoso',
    'Mars.moons': '2 (Fobos y Deimos)',
    'Mars.day': '24,6 h',
    'Mars.year': '687 días',
    'Mars.temp': '~−63 °C (promedio)',
    'Mars.note': 'Tonos oxidados y casquetes polares.',

    'Jupiter.label': 'Júpiter',
    'Jupiter.type': 'Gigante gaseoso',
    'Jupiter.moons': '95 conocidas',
    'Jupiter.day': '9,9 h',
    'Jupiter.year': '11,9 años',
    'Jupiter.temp': '~−108 °C',
    'Jupiter.note': 'El planeta más grande. Bandas turbulentas y la Gran Mancha Roja.',

    'Saturn.label': 'Saturno',
    'Saturn.type': 'Gigante gaseoso',
    'Saturn.moons': '146 conocidas',
    'Saturn.day': '10,7 h',
    'Saturn.year': '29,5 años',
    'Saturn.temp': '~−138 °C',
    'Saturn.note': 'Famoso por su sistema de anillos de hielo y roca.',

    'Uranus.label': 'Urano',
    'Uranus.type': 'Gigante de hielo',
    'Uranus.moons': '28 conocidas',
    'Uranus.day': '17,2 h',
    'Uranus.year': '84 años',
    'Uranus.temp': '~−195 °C',
    'Uranus.note': 'Gira casi de lado: rueda en vez de girar.',

    'Neptune.label': 'Neptuno',
    'Neptune.type': 'Gigante de hielo',
    'Neptune.moons': '16 conocidas',
    'Neptune.day': '16,1 h',
    'Neptune.year': '165 años',
    'Neptune.temp': '~−201 °C',
    'Neptune.note': 'El más lejano y ventoso, con los vientos más rápidos del sistema.',

    'Comet.label': 'Cometa',
    'Comet.type': 'Cometa',
    'Comet.moons': 'Ninguna',
    'Comet.day': '—',
    'Comet.year': 'Órbita muy elíptica',
    'Comet.temp': 'Varía según la distancia al Sol',
    'Comet.note': 'Su cola de gas y polvo siempre apunta en dirección opuesta al Sol.',
  },
};
