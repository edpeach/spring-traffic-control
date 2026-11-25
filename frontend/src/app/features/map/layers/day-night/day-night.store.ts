import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { GeoJsonFeatureCollection, GeoJsonPolygonGeometry } from '../map-layer';
import { DAY_NIGHT_LAYER_CONFIG } from './day-night.config';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function computeNightPolygon(date: Date): GeoJsonFeatureCollection<GeoJsonPolygonGeometry> {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
  const dayOfYear = (date.getTime() - startOfYear) / 86_400_000;
  const declinationRad = -23.44 * DEG_TO_RAD * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));

  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;
  let subsolarLon = (12 - utcHours) * 15;
  if (subsolarLon > 180) subsolarLon -= 360;
  if (subsolarLon < -180) subsolarLon += 360;

  const tanDecl = Math.tan(declinationRad);
  const safeTanDecl = Math.abs(tanDecl) < 1e-4 ? (tanDecl >= 0 ? 1e-4 : -1e-4) : tanDecl;

  const ring: [number, number][] = [];
  for (let lon = -180; lon <= 180; lon += DAY_NIGHT_LAYER_CONFIG.stepDegrees) {
    const hourAngleRad = (lon - subsolarLon) * DEG_TO_RAD;
    const lat = Math.atan(-Math.cos(hourAngleRad) / safeTanDecl) * RAD_TO_DEG;
    ring.push([lon, Math.max(-85, Math.min(85, lat))]);
  }

  const darkPoleLat = declinationRad >= 0 ? -85 : 85;
  ring.push([180, darkPoleLat], [-180, darkPoleLat], ring[0]);

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: { timestamp: date.toISOString() },
        geometry: {
          type: 'Polygon',
          coordinates: [ring],
        },
      },
    ],
  };
}

interface DayNightLayerState {
  timestamp: number;
}

export const DayNightLayerStore = signalStore(
  { providedIn: 'root' },
  withState<DayNightLayerState>({ timestamp: Date.now() }),
  withComputed(({ timestamp }) => ({
    nightGeoJson: computed(() => computeNightPolygon(new Date(timestamp()))),
  })),
  withMethods((store) => ({
    refresh(date: Date = new Date()): void {
      patchState(store, { timestamp: date.getTime() });
    },
  })),
);
