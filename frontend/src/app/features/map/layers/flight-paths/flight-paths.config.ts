export const FLIGHT_PATHS_LAYER_CONFIG = {
  id: 'flight-paths' as const,
  sourceId: 'flight-paths-source',
  lineLayerId: 'flight-paths-line',
  arrivalColor: '#48c9ff',
  departureColor: '#6db33f',
  highlightColor: '#ffd166',
  defaultWidth: 0.8,
  highlightWidth: 3,
  defaultOpacity: 0.2,
  dimmedOpacity: 0.1,
  arcSegments: 32,
} as const;
