import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { ScheduledFlight } from '../../../flights/models/schedule.model';
import { ScheduleStore } from '../../../flights/store/schedule.store';
import { Station } from '../../../stations/models/station.model';
import { StationStore } from '../../../stations/store/station.store';
import {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  GeoJsonMultiLineStringGeometry,
} from '../map-layer';
import { FLIGHT_PATHS_LAYER_CONFIG } from './flight-paths.config';

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Computes a great-circle curved arc between two [lon, lat] points using spherical linear
 * interpolation (SLERP), splitting segments cleanly across the antimeridian (±180°).
 */
export function computeCurvedArc(
  from: [number, number],
  to: [number, number],
  segments: number = FLIGHT_PATHS_LAYER_CONFIG.arcSegments,
): [number, number][][] {
  const [lon1, lat1] = from;
  const [lon2, lat2] = to;

  const phi1 = lat1 * DEG_TO_RAD;
  const lam1 = lon1 * DEG_TO_RAD;
  const phi2 = lat2 * DEG_TO_RAD;
  const lam2 = lon2 * DEG_TO_RAD;

  const x1 = Math.cos(phi1) * Math.cos(lam1);
  const y1 = Math.cos(phi1) * Math.sin(lam1);
  const z1 = Math.sin(phi1);

  const x2 = Math.cos(phi2) * Math.cos(lam2);
  const y2 = Math.cos(phi2) * Math.sin(lam2);
  const z2 = Math.sin(phi2);

  const dot = Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2));
  const omega = Math.acos(dot);

  if (omega < 1e-6) {
    return [[from, to]];
  }

  const sinOmega = Math.sin(omega);
  const points: [number, number][] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = Math.sin((1 - t) * omega) / sinOmega;
    const b = Math.sin(t * omega) / sinOmega;

    const x = a * x1 + b * x2;
    const y = a * y1 + b * y2;
    const z = a * z1 + b * z2;

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * RAD_TO_DEG;
    const lon = Math.atan2(y, x) * RAD_TO_DEG;
    points.push([lon, lat]);
  }

  // Split into sub-lines if any consecutive pair crosses the ±180° antimeridian
  const lines: [number, number][][] = [];
  let current: [number, number][] = [points[0]];

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const next = points[i];
    if (Math.abs(next[0] - prev[0]) > 180) {
      if (current.length > 1) lines.push(current);
      current = [next];
    } else {
      current.push(next);
    }
  }
  if (current.length > 1) lines.push(current);

  return lines.length ? lines : [[from, to]];
}

interface FlightPathsLayerState {
  selectedFlightName: string | null;
}

export const FlightPathsLayerStore = signalStore(
  { providedIn: 'root' },
  withState<FlightPathsLayerState>({ selectedFlightName: null }),
  withComputed(({ selectedFlightName }) => {
    const scheduleStore = inject(ScheduleStore);
    const stationStore = inject(StationStore);

    const stationByCode = computed(() => {
      const lookup = new Map<string, Station>();
      for (const station of stationStore.stations()) {
        if (station.latitude == null || station.longitude == null) continue;
        if (station.iata) lookup.set(station.iata.toUpperCase(), station);
        if (station.icao) lookup.set(station.icao.toUpperCase(), station);
      }
      return lookup;
    });

    const selectedFlight = computed<ScheduledFlight | null>(() => {
      const name = selectedFlightName()?.trim().toUpperCase();
      if (!name) return null;
      return scheduleStore.flights().find((f) => f.flightName.toUpperCase() === name) ?? null;
    });

    const geoJson = computed<GeoJsonFeatureCollection<GeoJsonMultiLineStringGeometry>>(() => {
      const stations = stationByCode();
      const selectedName = selectedFlightName()?.trim().toUpperCase() ?? null;
      const highlightedStation =
        stationStore.highlightedStationCode()?.trim().toUpperCase() ?? null;
      const hasHighlight = selectedName != null || highlightedStation != null;

      // Deduplicate by (origin, destination, direction) so codeshares don't stack identical arcs
      const routeMap = new Map<string, { flight: ScheduledFlight; count: number }>();
      for (const flight of scheduleStore.flights()) {
        const origin = flight.originCode?.trim().toUpperCase();
        const dest = flight.destinationCode?.trim().toUpperCase();
        if (!origin || !dest || origin === dest) continue;

        const key = `${origin}->${dest}|${flight.flightDirection}`;
        const existing = routeMap.get(key);
        const isMain = !flight.mainFlight || flight.flightName === flight.mainFlight;
        if (!existing) {
          routeMap.set(key, { flight, count: 1 });
        } else {
          existing.count += 1;
          if (isMain || (selectedName && flight.flightName.toUpperCase() === selectedName)) {
            existing.flight = flight;
          }
        }
      }

      const features: GeoJsonFeature<GeoJsonMultiLineStringGeometry>[] = [];

      for (const [key, { flight, count }] of routeMap.entries()) {
        const originCode = flight.originCode!.toUpperCase();
        const destCode = flight.destinationCode!.toUpperCase();
        const originStation = stations.get(originCode);
        const destStation = stations.get(destCode);
        if (!originStation || !destStation) continue;

        const highlighted =
          (selectedName != null &&
            (flight.flightName.toUpperCase() === selectedName ||
              flight.mainFlight?.toUpperCase() === selectedName ||
              flight.codeshares.some((c) => c.toUpperCase() === selectedName))) ||
          (highlightedStation != null &&
            (originCode === highlightedStation ||
              destCode === highlightedStation ||
              originStation.icao?.toUpperCase() === highlightedStation ||
              destStation.icao?.toUpperCase() === highlightedStation));

        const coordinates = computeCurvedArc(
          [originStation.longitude!, originStation.latitude!],
          [destStation.longitude!, destStation.latitude!],
        );

        features.push({
          type: 'Feature',
          id: key,
          properties: {
            routeKey: key,
            flightName: flight.flightName,
            direction: flight.flightDirection,
            originCode,
            destinationCode: destCode,
            flightCount: count,
            highlighted,
            dimmed: hasHighlight && !highlighted,
          },
          geometry: {
            type: 'MultiLineString',
            coordinates,
          },
        });
      }

      return {
        type: 'FeatureCollection',
        features,
      };
    });

    return {
      selectedFlight,
      geoJson,
    };
  }),
  withMethods((store) => ({
    selectFlight(selectedFlightName: string | null): void {
      patchState(store, { selectedFlightName });
    },
    clearSelection(): void {
      patchState(store, { selectedFlightName: null });
    },
  })),
);
