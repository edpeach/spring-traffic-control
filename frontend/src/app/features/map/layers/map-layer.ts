import type { Map as MapLibreMap } from 'maplibre-gl';
import { MapLayerId } from '../config/map.config';

export interface GeoJsonPointGeometry {
  type: 'Point';
  coordinates: [number, number];
}

export interface GeoJsonPolygonGeometry {
  type: 'Polygon';
  coordinates: [number, number][][];
}

export interface GeoJsonLineStringGeometry {
  type: 'LineString';
  coordinates: [number, number][];
}

export interface GeoJsonMultiLineStringGeometry {
  type: 'MultiLineString';
  coordinates: [number, number][][];
}

export type GeoJsonGeometry =
  | GeoJsonPointGeometry
  | GeoJsonPolygonGeometry
  | GeoJsonLineStringGeometry
  | GeoJsonMultiLineStringGeometry;

export interface GeoJsonFeature<G extends GeoJsonGeometry> {
  type: 'Feature';
  id?: string | number;
  properties: Record<string, unknown>;
  geometry: G;
}

export interface GeoJsonFeatureCollection<G extends GeoJsonGeometry> {
  type: 'FeatureCollection';
  features: GeoJsonFeature<G>[];
}

export interface MapLayerAdapter {
  readonly id: MapLayerId;
  readonly mapLayerIds: readonly string[];
  attach(map: MapLibreMap): void;
  sync(map: MapLibreMap): void;
  setVisible(map: MapLibreMap, visible: boolean): void;
  detach(map: MapLibreMap): void;
}
