import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Station } from '../models/station.model';

export type StationsViewMode = 'table' | 'cards';
export type StationCodeDisplay = 'icao' | 'iata';

interface StationState {
  stations: Station[];
  selectedStation: Station | null;
  highlightedStationCode: string | null;
  loading: boolean;
  detailLoading: boolean;
  syncing: boolean;
  syncMessage: string | null;
  error: string | null;
  query: string;
  viewMode: StationsViewMode;
  codeDisplay: StationCodeDisplay;
}

const initialState: StationState = {
  stations: [],
  selectedStation: null,
  highlightedStationCode: null,
  loading: false,
  detailLoading: false,
  syncing: false,
  syncMessage: null,
  error: null,
  query: '',
  viewMode: 'table',
  codeDisplay: 'icao',
};

export const StationStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ stations, query }) => ({
    filteredStations: computed(() => {
      const term = query().trim().toLowerCase();
      if (!term) return stations();
      return stations().filter((s) =>
        [s.name, s.icao, s.iata, s.country, s.city, s.airportType]
          .filter(Boolean)
          .some((field) => field!.toLowerCase().includes(term)),
      );
    }),
    totalCount: computed(() => stations().length),
  })),
  withMethods((store) => ({
    setStations(stations: Station[]): void {
      patchState(store, { stations, loading: false, error: null });
    },
    setSelectedStation(selectedStation: Station | null): void {
      patchState(store, { selectedStation, detailLoading: false, error: null });
    },
    highlightStationOnMap(highlightedStationCode: string | null): void {
      patchState(store, { highlightedStationCode });
    },
    setLoading(loading: boolean): void {
      patchState(store, { loading, ...(loading ? { error: null } : {}) });
    },
    setDetailLoading(detailLoading: boolean): void {
      patchState(store, { detailLoading, ...(detailLoading ? { error: null } : {}) });
    },
    setSyncing(syncing: boolean): void {
      patchState(store, { syncing, ...(syncing ? { error: null, syncMessage: null } : {}) });
    },
    setSyncMessage(syncMessage: string | null): void {
      patchState(store, { syncMessage, syncing: false });
    },
    setError(error: string | null): void {
      patchState(store, { error, loading: false, detailLoading: false, syncing: false });
    },
    setQuery(query: string): void {
      patchState(store, { query });
    },
    setViewMode(viewMode: StationsViewMode): void {
      patchState(store, { viewMode });
    },
    setCodeDisplay(codeDisplay: StationCodeDisplay): void {
      patchState(store, { codeDisplay });
    },
    toggleCodeDisplay(): void {
      patchState(store, { codeDisplay: store.codeDisplay() === 'icao' ? 'iata' : 'icao' });
    },
  })),
);
