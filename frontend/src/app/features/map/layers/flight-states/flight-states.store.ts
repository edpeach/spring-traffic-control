import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  AirportFlight,
  buildScheduleCallsignIndex,
  findLinkedSchedule,
  findScheduleByRouteAndTime,
  LiveFlightState,
  StateVector,
} from '../../../flights/models/flight-state.model';
import { ScheduleStore } from '../../../flights/store/schedule.store';
import { StationStore } from '../../../stations/store/station.store';
import { GeoJsonFeatureCollection, GeoJsonPointGeometry } from '../map-layer';

interface FlightStatesLayerState {
  arrivals: AirportFlight[];
  departures: AirportFlight[];
  states: StateVector[];
  loading: boolean;
  error: string | null;
  selectedIcao24: string | null;
}

const initialState: FlightStatesLayerState = {
  arrivals: [],
  departures: [],
  states: [],
  loading: false,
  error: null,
  selectedIcao24: null,
};

const HOME_AIRPORT_ICAO = 'EHAM';

function normalizeCallsign(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim().toUpperCase();
  return trimmed ? trimmed : null;
}

function normalizeAirportCode(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim().toUpperCase();
  return trimmed ? trimmed : null;
}

function flightRecency(flight: AirportFlight): number {
  return Math.max(flight.lastSeen ?? 0, flight.firstSeen ?? 0);
}

function flightMatchKey(icao24: string, callsign: string): string {
  return `${icao24}|${callsign}`;
}

function latestByIcao24AndCallsign(flights: AirportFlight[]): Map<string, AirportFlight> {
  const map = new Map<string, AirportFlight>();
  for (const flight of flights) {
    const icao24 = flight.icao24.trim().toLowerCase();
    const callsign = normalizeCallsign(flight.callsign);
    if (!icao24 || !callsign) continue;
    const key = flightMatchKey(icao24, callsign);
    const existing = map.get(key);
    if (!existing || flightRecency(flight) >= flightRecency(existing)) {
      map.set(key, flight);
    }
  }
  return map;
}

function selectActiveAirportFlight(
  arrival: AirportFlight | null,
  departure: AirportFlight | null,
): AirportFlight | null {
  if (!arrival) return departure;
  if (!departure) return arrival;
  return flightRecency(departure) >= flightRecency(arrival) ? departure : arrival;
}

export const FlightStatesLayerStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => {
    const scheduleStore = inject(ScheduleStore);
    const stationStore = inject(StationStore);

    const icaoToIata = computed(() => {
      const map = new Map<string, string>();
      for (const station of stationStore.stations()) {
        if (station.icao && station.iata) {
          map.set(station.icao.trim().toUpperCase(), station.iata.trim().toUpperCase());
        }
      }
      return map;
    });

    const liveFlights = computed<LiveFlightState[]>(() => {
      const arrivals = store.arrivals();
      const departures = store.departures();
      const states = store.states();
      const scheduledFlights = scheduleStore.flights();
      const scheduleIndex = buildScheduleCallsignIndex(scheduledFlights);
      const airportIataByIcao = icaoToIata();

      const arrivalByKey = latestByIcao24AndCallsign(arrivals);
      const departureByKey = latestByIcao24AndCallsign(departures);

      const matched: LiveFlightState[] = [];

      for (const state of states) {
        if (state.latitude == null || state.longitude == null) continue;

        const icao24 = state.icao24.trim().toLowerCase();
        const callsign = normalizeCallsign(state.callsign);
        if (!icao24 || !callsign) continue;

        // Match OpenSky EHAM arrivals/departures strictly on (icao24, trimmed callsign)
        // so aircraft currently serving another flight do not inherit stale legs.
        const key = flightMatchKey(icao24, callsign);
        const arrival = arrivalByKey.get(key) ?? null;
        const departure = departureByKey.get(key) ?? null;
        const activeOpenSky = selectActiveAirportFlight(arrival, departure);

        // Also match Schiphol's schedule by trimmed callsign so airborne inbound flights
        // (not yet present in OpenSky's post-landing /flights/arrival list) are plotted.
        let schedule = findLinkedSchedule(callsign, scheduleIndex);
        if (!activeOpenSky && !schedule) continue;

        const estDeparture = normalizeAirportCode(activeOpenSky?.estDepartureAirport);
        const estArrival = normalizeAirportCode(activeOpenSky?.estArrivalAirport);

        let direction: 'A' | 'D' | null;
        if (estArrival === HOME_AIRPORT_ICAO) {
          direction = 'A';
        } else if (estArrival !== null) {
          direction = 'D';
        } else if (
          estDeparture === HOME_AIRPORT_ICAO ||
          (activeOpenSky !== null && activeOpenSky === departure)
        ) {
          direction = 'D';
        } else if (activeOpenSky !== null && activeOpenSky === arrival) {
          direction = 'A';
        } else {
          direction = schedule?.flightDirection ?? null;
        }

        // Best-effort route + airline + time fallback for deconflicted ATC callsigns (e.g. KLM163 -> KL735)
        if (!schedule && activeOpenSky && direction) {
          const partnerIcao = direction === 'A' ? estDeparture : estArrival;
          const partnerAirportIata = partnerIcao
            ? (airportIataByIcao.get(partnerIcao) ?? null)
            : null;
          const referenceEpochSeconds =
            direction === 'D'
              ? (activeOpenSky.firstSeen ?? activeOpenSky.lastSeen ?? null)
              : (activeOpenSky.lastSeen ?? activeOpenSky.firstSeen ?? null);

          schedule = findScheduleByRouteAndTime(scheduledFlights, {
            callsign,
            direction,
            partnerAirportIata,
            referenceEpochSeconds,
          });
        }

        const originCode = estDeparture ?? schedule?.originCode ?? null;
        const destinationCode = estArrival ?? schedule?.destinationCode ?? null;

        matched.push({
          state,
          arrival,
          departure,
          schedule,
          direction,
          originCode,
          destinationCode,
          displayCallsign: callsign,
        });
      }

      return matched;
    });

    const selectedFlight = computed<LiveFlightState | null>(() => {
      const icao24 = store.selectedIcao24();
      if (!icao24) return null;
      return (
        liveFlights().find((f) => f.state.icao24.toLowerCase() === icao24.toLowerCase()) ?? null
      );
    });

    const geoJson = computed<GeoJsonFeatureCollection<GeoJsonPointGeometry>>(() => {
      const selectedIcao24 = store.selectedIcao24()?.toLowerCase() ?? null;
      const hasSelection = selectedIcao24 !== null;

      return {
        type: 'FeatureCollection',
        features: liveFlights().map((flight) => {
          const icao24 = flight.state.icao24.toLowerCase();
          const highlighted = selectedIcao24 === icao24;
          const dimmed = hasSelection && !highlighted;

          return {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [flight.state.longitude!, flight.state.latitude!],
            },
            properties: {
              icao24,
              callsign: flight.displayCallsign,
              label: flight.schedule?.flightName ?? flight.displayCallsign,
              direction: flight.direction ?? '',
              trueTrack: flight.state.trueTrack ?? 0,
              highlighted,
              dimmed,
            },
          };
        }),
      };
    });

    return {
      liveFlights,
      liveCount: computed(() => liveFlights().length),
      selectedFlight,
      geoJson,
    };
  }),
  withMethods((store) => ({
    setLoading(loading: boolean): void {
      patchState(store, { loading, ...(loading ? { error: null } : {}) });
    },
    setError(error: string): void {
      patchState(store, { loading: false, error });
    },
    setArrivals(arrivals: AirportFlight[]): void {
      patchState(store, { arrivals });
    },
    setDepartures(departures: AirportFlight[]): void {
      patchState(store, { departures });
    },
    setStates(states: StateVector[]): void {
      patchState(store, { states, loading: false, error: null });
    },
    selectFlightState(icao24: string): void {
      patchState(store, { selectedIcao24: icao24.trim().toLowerCase() });
    },
    clearSelection(): void {
      patchState(store, { selectedIcao24: null });
    },
  })),
);
