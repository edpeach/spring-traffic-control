export const DAY_NIGHT_LAYER_CONFIG = {
  id: 'day-night' as const,
  sourceId: 'day-night-source',
  fillLayerId: 'day-night-fill',
  fillColor: '#040c16',
  fillOpacity: 0.36,
  stepDegrees: 2,
  refreshIntervalMs: 60_000,
} as const;
