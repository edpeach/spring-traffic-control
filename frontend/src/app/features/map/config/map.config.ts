export type MapProjection = 'mercator' | 'globe';

export type MapLayerId =
  'day-night' | 'flight-paths' | 'stations' | 'flight-track' | 'flight-states';

export interface MapLayerConfig {
  id: MapLayerId;
  label: string;
  icon: string;
  visible: boolean;
}

export interface MapCameraTarget {
  longitude: number;
  latitude: number;
  zoom?: number;
}

export interface MapCameraBounds {
  sw: [number, number];
  ne: [number, number];
  maxZoom?: number;
}

export const MAP_CONFIG = {
  workerUrl: '/assets/maplibre/maplibre-gl-worker.mjs',
  defaultCenter: [4.7639, 52.3086] as [number, number],
  defaultZoom: 5,
  selectionZoom: 10,
  flightSelectionZoom: 8,
  defaultProjection: 'mercator' as MapProjection,
  styles: {
    dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
    light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
  defaultLayers: [
    { id: 'day-night', label: 'Day / Night', icon: 'routine', visible: true },
    { id: 'flight-paths', label: 'Flight Paths', icon: 'route', visible: false },
    { id: 'stations', label: 'Stations', icon: 'flight_takeoff', visible: true },
    { id: 'flight-states', label: 'Live Flights', icon: 'flight', visible: true },
  ] as readonly MapLayerConfig[],
} as const;
