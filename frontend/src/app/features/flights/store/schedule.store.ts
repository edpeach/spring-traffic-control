import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  buildTurnaroundPairs,
  FlightDirection,
  ScheduledFlight,
  scheduledSortMs,
  TurnaroundSortBy,
} from '../models/schedule.model';

export type FlightsViewMode = 'table' | 'cards' | 'turnarounds';
export type DirectionFilter = 'ALL' | FlightDirection;

interface ScheduleState {
  flights: ScheduledFlight[];
  selectedFlightMatches: ScheduledFlight[];
  loading: boolean;
  detailLoading: boolean;
  syncing: boolean;
  syncMessage: string | null;
  error: string | null;
  query: string;
  directionFilter: DirectionFilter;
  viewMode: FlightsViewMode;
  turnaroundSortBy: TurnaroundSortBy;
  showDepartedTurnarounds: boolean;
}

const initialState: ScheduleState = {
  flights: [],
  selectedFlightMatches: [],
  loading: false,
  detailLoading: false,
  syncing: false,
  syncMessage: null,
  error: null,
  query: '',
  directionFilter: 'ALL',
  viewMode: 'table',
  turnaroundSortBy: 'arrival',
  showDepartedTurnarounds: false,
};

export const ScheduleStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(
    ({
      flights,
      selectedFlightMatches,
      query,
      directionFilter,
      turnaroundSortBy,
      showDepartedTurnarounds,
    }) => {
      const filteredFlights = computed(() => {
        const dir = directionFilter();
        const term = query().trim().toLowerCase();

        return flights()
          .filter((f) => dir === 'ALL' || f.flightDirection === dir)
          .filter((f) => {
            if (!term) return true;
            const scalarMatch = [
              f.flightName,
              f.mainFlight,
              f.originCode,
              f.destinationCode,
              f.aircraftRegistration,
              f.gate,
              f.prefixIata,
              f.prefixIcao,
            ]
              .filter(Boolean)
              .some((field) => field!.toLowerCase().includes(term));

            if (scalarMatch) return true;
            return f.codeshares.some((code) => code.toLowerCase().includes(term));
          })
          .sort((a, b) => scheduledSortMs(a) - scheduledSortMs(b));
      });

      const turnaroundPairs = computed(() =>
        buildTurnaroundPairs(filteredFlights(), turnaroundSortBy(), showDepartedTurnarounds()),
      );

      const selectedFlight = computed(() => selectedFlightMatches()[0] ?? null);

      return {
        filteredFlights,
        turnaroundPairs,
        selectedFlight,
        totalCount: computed(() => flights().length),
      };
    },
  ),
  withMethods((store) => ({
    setFlights(flights: ScheduledFlight[]): void {
      patchState(store, { flights, loading: false, error: null });
    },
    setSelectedFlightMatches(selectedFlightMatches: ScheduledFlight[]): void {
      patchState(store, { selectedFlightMatches, detailLoading: false, error: null });
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
    setDirectionFilter(directionFilter: DirectionFilter): void {
      patchState(store, { directionFilter });
    },
    setViewMode(viewMode: FlightsViewMode): void {
      patchState(store, { viewMode });
    },
    setTurnaroundSortBy(turnaroundSortBy: TurnaroundSortBy): void {
      patchState(store, { turnaroundSortBy });
    },
    setShowDepartedTurnarounds(showDepartedTurnarounds: boolean): void {
      patchState(store, { showDepartedTurnarounds });
    },
  })),
);
