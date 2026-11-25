export const AIRPORT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v3"/><path d="M5 7h14l-1.5 4h-11L5 7Z"/><path d="M9 11l-.5 10"/><path d="M15 11l.5 10"/><path d="M7 21h10"/><path d="M8 5h8"/></svg>`;

export const STATIONS_LAYER_CONFIG = {
  id: 'stations' as const,
  sourceId: 'stations-source',
  iconLayerId: 'stations-icon',
  iconImageId: 'station-airport-icon',
  labelLayerId: 'stations-label',
  defaultColor: '#6db33f',
  highlightColor: '#ffd166',
  strokeColor: '#080c10',
  defaultOpacity: 0.9,
  dimmedOpacity: 0.35,
  iconSizeStops: {
    z2: { normal: 0.35, highlight: 0.65 },
    z6: { normal: 0.6, highlight: 0.95 },
    z10: { normal: 0.9, highlight: 1.3 },
    z14: { normal: 1.2, highlight: 1.6 },
  },
  labelMinZoom: 7,
} as const;
