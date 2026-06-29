# Sistema Solar 3D

Demo interactiva del sistema solar hecha con Astro y Three.js. Permite explorar una escena 3D con planetas animados, órbitas, etiquetas, selección por click/tap y controles accesibles.

## Funciones

- Sistema solar 3D con Sol, planetas, órbitas, anillos de Saturno, Luna y campo de estrellas.
- Órbitas elípticas con excentricidad e inclinación axial reales de cada planeta (Venus retrógrado, Urano tumbado).
- Cinturón de asteroides entre Marte y Júpiter renderizado con `InstancedMesh`.
- Lunas mayores: la Luna terrestre, las galileanas de Júpiter (Ío, Europa, Ganímedes, Calisto) y Titán en Saturno.
- Resplandor del Sol mediante bloom **selectivo** por capas (dos `EffectComposer` + `ShaderPass`): solo el Sol brilla, los planetas quedan nítidos.
- Sombras reales (`shadowMap`): los planetas y las lunas proyectan y reciben sombra, así que las lunas pueden eclipsar a su planeta.
- Cometa en órbita larga, excéntrica e inclinada, con una cola que siempre apunta en sentido contrario al Sol.
- Modo **escala real** alternable: reposiciona las órbitas de forma proporcional a las distancias reales (en UA) manteniendo los tamaños visibles.
- Control de **fecha**: coloca los planetas en su posición heliocéntrica aproximada para un día dado (longitudes medias J2000 y periodos siderales) y botón "Hoy".
- Tour guiado que recorre el Sol y los planetas enfocándolos uno a uno.
- Selector "Ir a" en la barra para saltar a cualquier cuerpo, sincronizado con la selección actual.
- Botón "Compartir" que copia una URL con la vista de cámara y el cuerpo seleccionado codificados en el hash (restaurados al abrir el enlace).
- Panel de rendimiento (FPS) activable, sin dependencias externas.
- Controles de cámara con arrastre, zoom y reset.
- Pausa/reanudación, velocidad ajustable y toggles de etiquetas/órbitas.
- Click o tap en un planeta para enfocarlo y ver una tarjeta con datos reales (diámetro, lunas, día, año, temperatura).
- Overlay inicial, loader, fallback si WebGL no está disponible y soporte básico para `prefers-reduced-motion`.
- Texturas generadas por canvas para diferenciar planetas sin añadir dependencias.

## Comandos

```sh
pnpm install
pnpm dev
pnpm build
pnpm preview
pnpm test          # Vitest (tests de datos)
pnpm lint          # ESLint
pnpm format        # Prettier
```

Integración continua en GitHub Actions (`.github/workflows/ci.yml`): instala, lint, test y build en cada push y pull request.

## Estructura

```text
src/pages/index.astro          Página principal y metadata
src/components/SolarSystem.astro UI, controles y estilos
src/utils/solarSystem.ts       Escena Three.js y lógica de interacción
src/data/planets.ts            Fuente única de datos (física, facts, datos orbitales y cometa)
src/data/planets.test.ts       Tests de integridad de los datos (Vitest)
public/textures/               Texturas usadas por Tierra y Luna
```

## Nota de escala

Por defecto la escala es artística: las distancias y tamaños están ajustados para que el sistema sea navegable en pantalla. El botón "Escala real" reposiciona las órbitas de forma proporcional a las distancias reales (en UA); los tamaños de los planetas se mantienen exagerados para que sigan siendo visibles. El control de fecha y la longitud heliocéntrica son aproximaciones didácticas (se ignora la orientación real de cada órbita).
