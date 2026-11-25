import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { EnrichedFlightTrack } from '../../../flights/models/flight-state.model';
import { Station, stationRouteCode } from '../../../stations/models/station.model';
import { StationStore } from '../../../stations/store/station.store';
import { MapStore } from '../../store/map.store';
import { computeCurvedArc } from '../flight-paths/flight-paths.store';
import { FlightStatesLayerStore } from '../flight-states/flight-states.store';
import { StationsLayerStore } from '../stations/stations.store';
import {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  GeoJsonMultiLineStringGeometry,
} from '../map-layer';

const EARTH_RADIUS_KM = 6371;

function haversineDistanceKm(from: [number, number], to: [number, number]): number {
  const [lon1, lat1] = from;
  const [lon2, lat2] = to;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface FlightTrackLayerState {
  activeIcao24: string | null;
  track: EnrichedFlightTrack | null;
  loading: boolean;
  error: string | null;
}

const initialState: FlightTrackLayerState = {
  activeIcao24: null,
  track: null,
  loading: false,
  error: null,
};

function splitAntimeridian(points: [number, number][]): [number, number][][] {
  if (points.length < 2) return [];
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
  return lines;
}

export const FlightTrackLayerStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => {
    const stationStore = inject(StationStore);
    const flightStatesStore = inject(FlightStatesLayerStore);
    const stationsLayerStore = inject(StationsLayerStore);
    const mapStore = inject(MapStore);

    const stationByCode = computed(() => {
      const lookup = new Map<string, Station>();
      for (const station of stationStore.stations()) {
        if (station.latitude == null || station.longitude == null) continue;
        if (station.iata) lookup.set(station.iata.toUpperCase(), station);
        if (station.icao) lookup.set(station.icao.toUpperCase(), station);
      }
      return lookup;
    });

    const flownGeoJson = computed<GeoJsonFeatureCollection<GeoJsonMultiLineStringGeometry>>(() => {
      const track = store.track();
      const activeIcao24 = store.activeIcao24();
      if (!track || !activeIcao24 || track.path.length < 2) {
        return { type: 'FeatureCollection', features: [] };
      }

      const points: [number, number][] = track.path.map((wp) => [wp.longitude, wp.latitude]);
      const lines = splitAntimeridian(points);
      if (lines.length === 0) {
        return { type: 'FeatureCollection', features: [] };
      }

      const feature: GeoJsonFeature<GeoJsonMultiLineStringGeometry> = {
        type: 'Feature',
        id: `${activeIcao24}-flown`,
        properties: {
          icao24: activeIcao24,
          callsign: track.callsign ?? '',
          segment: 'flown',
        },
        geometry: {
          type: 'MultiLineString',
          coordinates: lines,
        },
      };

      return { type: 'FeatureCollection', features: [feature] };
    });

    const remainingGeoJson = computed<GeoJsonFeatureCollection<GeoJsonMultiLineStringGeometry>>(
      () => {
        const activeIcao24 = store.activeIcao24();
        if (!activeIcao24) {
          return { type: 'FeatureCollection', features: [] };
        }

        const track = store.track();
        const selectedLive = flightStatesStore.selectedFlight();

        // Start of remaining leg: last flown track waypoint or live aircraft position
        const lastWaypoint = track?.path.length ? track.path[track.path.length - 1] : null;
        const fromPoint: [number, number] | null = lastWaypoint
          ? [lastWaypoint.longitude, lastWaypoint.latitude]
          : selectedLive?.state.longitude != null && selectedLive.state.latitude != null
            ? [selectedLive.state.longitude, selectedLive.state.latitude]
            : null;

        if (!fromPoint) {
          return { type: 'FeatureCollection', features: [] };
        }

        // Destination airport coordinates:
        // 1. OpenSky estArrivalAirport linked via icao24 (selectedLive.destinationCode) -> StationStore lookup
        // 2. track.toStation (backend enriched from estArrivalAirport / schedule)
        // 3. track.remainingPath[1]
        let toPoint: [number, number] | null = null;
        if (selectedLive?.destinationCode) {
          const station = stationByCode().get(selectedLive.destinationCode.trim().toUpperCase());
          if (station?.longitude != null && station.latitude != null) {
            toPoint = [station.longitude, station.latitude];
          }
        }
        if (!toPoint && track?.toStation?.longitude != null && track.toStation.latitude != null) {
          toPoint = [track.toStation.longitude, track.toStation.latitude];
        }
        if (!toPoint && track?.remainingPath && track.remainingPath.length >= 2) {
          const dest = track.remainingPath[1];
          if (dest.length >= 2) {
            toPoint = [dest[0], dest[1]];
          }
        }

        if (!toPoint) {
          return { type: 'FeatureCollection', features: [] };
        }

        const coordinates = computeCurvedArc(fromPoint, toPoint);

        const feature: GeoJsonFeature<GeoJsonMultiLineStringGeometry> = {
          type: 'Feature',
          id: `${activeIcao24}-remaining`,
          properties: {
            icao24: activeIcao24,
            callsign: track?.callsign ?? selectedLive?.displayCallsign ?? '',
            segment: 'remaining',
          },
          geometry: {
            type: 'MultiLineString',
            coordinates,
          },
        };

        return { type: 'FeatureCollection', features: [feature] };
      },
    );

    const closestAirportsGeoJson = computed<
      GeoJsonFeatureCollection<GeoJsonMultiLineStringGeometry>
    >(() => {
      const selectedLive = flightStatesStore.selectedFlight();
      const track = store.track();
      const lastWaypoint = track?.path.length ? track.path[track.path.length - 1] : null;
      const fromPoint: [number, number] | null =
        selectedLive?.state.longitude != null && selectedLive.state.latitude != null
          ? [selectedLive.state.longitude, selectedLive.state.latitude]
          : lastWaypoint
            ? [lastWaypoint.longitude, lastWaypoint.latitude]
            : null;

      if (!fromPoint) {
        return { type: 'FeatureCollection', features: [] };
      }

      const closest = mapStore.closestAirports();
      const highlightedCodes = stationsLayerStore.highlightedCodes();
      const selectedStation = stationsLayerStore.selectedStation();
      const stationsLookup = stationByCode();

      // Combine closestAirports with any additionally selected/highlighted stations
      // so paths always appear whenever both a flight and station(s) are selected.
      const targets: { station: Station; distanceKm: number }[] = [];
      const seenIds = new Set<string>();

      for (const entry of closest) {
        if (entry.station.longitude == null || entry.station.latitude == null) continue;
        seenIds.add(entry.station.id);
        targets.push(entry);
      }

      const addExtraStation = (station: Station | null | undefined) => {
        if (!station || station.longitude == null || station.latitude == null) return;
        if (seenIds.has(station.id)) return;
        seenIds.add(station.id);
        targets.push({
          station,
          distanceKm: haversineDistanceKm(fromPoint, [station.longitude, station.latitude]),
        });
      };

      addExtraStation(selectedStation);
      for (const rawCode of highlightedCodes) {
        const match = stationsLookup.get(rawCode.trim().toUpperCase());
        addExtraStation(match);
      }

      if (targets.length === 0) {
        return { type: 'FeatureCollection', features: [] };
      }

      const focusedCode = mapStore.focusedClosestAirportCode();
      const features: GeoJsonFeature<GeoJsonMultiLineStringGeometry>[] = [];

      targets.forEach((entry, index) => {
        const { station, distanceKm } = entry;
        const code = stationRouteCode(station);
        const upperCode = code.toUpperCase();
        const focused =
          focusedCode != null &&
          (focusedCode === upperCode ||
            station.icao?.toUpperCase() === focusedCode ||
            station.iata?.toUpperCase() === focusedCode);

        features.push({
          type: 'Feature',
          id: `closest-airport-${station.id}`,
          properties: {
            code,
            name: station.name,
            rank: index + 1,
            distanceKm,
            distanceLabel: `${code} · ${distanceKm.toFixed(1)} km`,
            focused,
          },
          geometry: {
            type: 'MultiLineString',
            coordinates: computeCurvedArc(fromPoint, [station.longitude!, station.latitude!]),
          },
        });
      });

      return { type: 'FeatureCollection', features };
    });

    return {
      flownGeoJson,
      remainingGeoJson,
      closestAirportsGeoJson,
    };
  }),
  withMethods((store) => ({
    setLoading(icao24: string): void {
      patchState(store, {
        activeIcao24: icao24.trim().toLowerCase(),
        track: null,
        loading: true,
        error: null,
      });
    },
    setTrack(track: EnrichedFlightTrack): void {
      patchState(store, {
        activeIcao24: track.icao24.trim().toLowerCase(),
        track,
        loading: false,
        error: null,
      });
    },
    setError(error: string): void {
      patchState(store, {
        track: null,
        loading: false,
        error,
      });
    },
    clear(): void {
      patchState(store, initialState);
    },
  })),
);
