export const FLIGHT_STATES_LAYER_CONFIG = {
  id: 'flight-states',
  sourceId: 'flight-states-source',
  iconLayerId: 'flight-states-icon',
  labelLayerId: 'flight-states-label',
  iconImageId: 'flight-state-airplane',
  arrivalColor: '#38bdf8',
  departureColor: '#a78bfa',
  defaultColor: '#22c55e',
  highlightColor: '#f59e0b',
  strokeColor: '#0b1116',
  defaultOpacity: 0.95,
  dimmedOpacity: 0.22,
  labelMinZoom: 6,
  iconSizeStops: {
    z2: { normal: 0.45, highlight: 0.7 },
    z6: { normal: 0.65, highlight: 0.95 },
    z10: { normal: 0.85, highlight: 1.2 },
    z14: { normal: 1.05, highlight: 1.45 },
  },
} as const;

/**
 * North-pointing (0 deg) aeroplane silhouette rendered as a MapLibre SDF image
 * so `icon-color` and `icon-rotate` (trueTrack) work natively on the GPU.
 */
export const AIRPLANE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
  <path fill="#ffffff" d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
</svg>`;
