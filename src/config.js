// Single place that ties the intro to the existing GEO.AI platform.
// Routes were read from the live app (geoai-interplanetary.goskip.app):
//   "/"     → current landing (Iniciar → /mars)
//   "/moon" → Moon 3D viewer
//   "/mars" → Mars 3D viewer
// The intro never touches the platform; it only navigates to these URLs.

export const PLATFORM_ORIGIN = 'https://geoai-interplanetary.goskip.app';

export const DESTINATIONS = {
  moon: `${PLATFORM_ORIGIN}/moon`,
  mars: `${PLATFORM_ORIGIN}/mars`,
};

// Same default as the current "Iniciar" button.
export const DEFAULT_DESTINATION = 'mars';

export const SCENES = [
  { id: 'briefing', n: '01' },
  { id: 'boarding', n: '02' },
  { id: 'cockpit', n: '03' },
  { id: 'launch', n: '04' },
];

export function platformUrl(dest) {
  return DESTINATIONS[dest] || DESTINATIONS[DEFAULT_DESTINATION];
}

// Device capability → render quality. Kept deliberately coarse.
export function detectQuality() {
  // ?reduced forces the simplified path for testing on machines without the OS setting.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    || new URLSearchParams(location.search).has('reduced');
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = Math.min(window.innerWidth, window.innerHeight) < 600;
  const cores = navigator.hardwareConcurrency || 4;
  const mem = navigator.deviceMemory || 8;
  const low = coarse || small || cores <= 4 || mem <= 4;
  return {
    tier: low ? 'low' : 'high',
    reducedMotion,
    dpr: Math.min(window.devicePixelRatio || 1, low ? 1.25 : 1.75),
    bloom: !low,
    particles: low ? 260 : 900,
  };
}
