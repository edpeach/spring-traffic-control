import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Station, stationRouteCode } from '../../../stations/models/station.model';
import { StationStore } from '../../../stations/store/station.store';
import { GeoJsonFeatureCollection, GeoJsonPointGeometry } from '../map-layer';

interface StationsLayerState {
  highlightedCodes: string[];
}

export const StationsLayerStore = signalStore(
  { providedIn: 'root' },
  withState<StationsLayerState>({ highlightedCodes: [] }),
  withComputed(({ highlightedCodes }) => {
    const stationStore = inject(StationStore);

    const activeHighlightCodes = computed(() => {
      const codes = new Set(highlightedCodes().map((c) => c.toUpperCase()));
      const selected = stationStore.highlightedStationCode();
      if (selected) codes.add(selected.toUpperCase());
      return codes;
    });

    const mappableStations = computed(() =>
      stationStore.stations().filter((s) => s.latitude != null && s.longitude != null),
    );

    const selectedStation = computed<Station | null>(() => {
      const code = stationStore.highlightedStationCode();
      if (!code) return null;
      const normalized = code.toUpperCase();
      return (
        stationStore
          .stations()
          .find(
            (s) =>
              s.icao?.toUpperCase() === normalized ||
              s.iata?.toUpperCase() === normalized ||
              s.id.toUpperCase() === normalized,
          ) ?? null
      );
    });

    const geoJson = computed<GeoJsonFeatureCollection<GeoJsonPointGeometry>>(() => {
      const highlights = activeHighlightCodes();
      const hasHighlights = highlights.size > 0;
      const codeDisplay = stationStore.codeDisplay();

      return {
        type: 'FeatureCollection',
        features: mappableStations().map((station) => {
          const code = stationRouteCode(station);
          const highlighted =
            highlights.has(code.toUpperCase()) ||
            (station.icao != null && highlights.has(station.icao.toUpperCase())) ||
            (station.iata != null && highlights.has(station.iata.toUpperCase()));
          const label =
            codeDisplay === 'iata'
              ? station.iata || station.icao || station.name
              : station.icao || station.iata || station.name;

          return {
            type: 'Feature',
            id: station.id,
            properties: {
              id: station.id,
              code,
              label,
              name: station.name,
              highlighted,
              dimmed: hasHighlights && !highlighted,
            },
            geometry: {
              type: 'Point',
              coordinates: [station.longitude!, station.latitude!],
            },
          };
        }),
      };
    });

    return {
      mappableStations,
      selectedStation,
      geoJson,
    };
  }),
  withMethods((store) => {
    const stationStore = inject(StationStore);
    return {
      selectStation(code: string | null): void {
        stationStore.highlightStationOnMap(code);
      },
      setHighlightedCodes(highlightedCodes: string[]): void {
        patchState(store, { highlightedCodes });
      },
      clearHighlights(): void {
        patchState(store, { highlightedCodes: [] });
        stationStore.highlightStationOnMap(null);
      },
    };
  }),
);
