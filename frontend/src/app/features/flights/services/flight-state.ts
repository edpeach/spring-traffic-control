import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, EMPTY, forkJoin, map, of, Subscription, switchMap, tap } from 'rxjs';
import { z } from 'zod';
import { FlightStatesLayerStore } from '../../map/layers/flight-states/flight-states.store';
import { FlightTrackLayerStore } from '../../map/layers/flight-track/flight-track.store';
import { MapStore } from '../../map/store/map.store';
import { NearestStationSchema } from '../../stations/models/station.model';
import {
  AirportFlightSchema,
  EnrichedFlightTrackSchema,
  StateVectorSchema,
} from '../models/flight-state.model';

const AirportFlightsListSchema = z.array(AirportFlightSchema);
const StateVectorsListSchema = z.array(StateVectorSchema);
const NearestStationsListSchema = z.array(NearestStationSchema);

@Service()
export class FlightState {
  private readonly http = inject(HttpClient);
  private readonly store = inject(FlightStatesLayerStore);
  private readonly trackStore = inject(FlightTrackLayerStore);
  private readonly mapStore = inject(MapStore);
  private trackSub: Subscription | null = null;
  private nearestSub: Subscription | null = null;

  /**
   * First loads and caches EHAM arriving and departing flights for the day
   * (`/api/flights/arrival` & `/api/flights/departure`), then loads cached live
   * aircraft states (`/api/states/all`).
   */
  loadAirportTraffic(airport = 'EHAM'): void {
    this.store.setLoading(true);
    const params = new HttpParams().set('airport', airport);

    const arrivals$ = this.http.get<unknown>('/api/flights/arrival', { params }).pipe(
      map((raw) => AirportFlightsListSchema.parse(raw)),
      catchError(() => of([])),
    );

    const departures$ = this.http.get<unknown>('/api/flights/departure', { params }).pipe(
      map((raw) => AirportFlightsListSchema.parse(raw)),
      catchError(() => of([])),
    );

    forkJoin({ arrivals: arrivals$, departures: departures$ })
      .pipe(
        tap(({ arrivals, departures }) => {
          this.store.setArrivals(arrivals);
          this.store.setDepartures(departures);
        }),
        switchMap(() =>
          this.http.get<unknown>('/api/states/all').pipe(
            map((raw) => StateVectorsListSchema.parse(raw)),
            tap((states) => this.store.setStates(states)),
            catchError(() => {
              this.store.setError('Unable to load live OpenSky flight states.');
              return of([]);
            }),
          ),
        ),
      )
      .subscribe();
  }

  /**
   * Loads the cached OpenSky flight track (`/api/tracks?icao24=...`) for the
   * currently selected aircraft and updates `FlightTrackLayerStore`.
   */
  loadTrack(icao24: string): void {
    const normalized = icao24.trim().toLowerCase();
    if (!normalized) return;

    this.trackSub?.unsubscribe();
    this.trackStore.setLoading(normalized);

    const params = new HttpParams().set('icao24', normalized);
    this.trackSub = this.http
      .get<unknown>('/api/tracks', { params })
      .pipe(
        map((raw) => EnrichedFlightTrackSchema.parse(raw)),
        tap((track) => this.trackStore.setTrack(track)),
        catchError(() => {
          this.trackStore.setError('Flight track unavailable for this aircraft.');
          return EMPTY;
        }),
      )
      .subscribe();
  }

  clearTrack(): void {
    this.trackSub?.unsubscribe();
    this.trackSub = null;
    this.trackStore.clear();
  }

  /**
   * Loads the closest airports to an airborne aircraft (`/api/flights/opensky/{icao24}/nearest-airports`)
   * and stores them in `MapStore` for map highlighting and side-panel display.
   */
  loadNearestAirports(icao24: string, limit = 5, emergencyOnly = false): void {
    const normalized = icao24.trim().toLowerCase();
    if (!normalized) return;

    this.nearestSub?.unsubscribe();
    this.mapStore.setClosestAirportsLoading(true);

    const params = new HttpParams()
      .set('limit', String(limit))
      .set('emergency', String(emergencyOnly));

    this.nearestSub = this.http
      .get<unknown>(`/api/flights/opensky/${encodeURIComponent(normalized)}/nearest-airports`, {
        params,
      })
      .pipe(
        map((raw) => NearestStationsListSchema.parse(raw)),
        tap((airports) => this.mapStore.setClosestAirports(airports)),
        catchError(() => {
          this.mapStore.setClosestAirports([]);
          return EMPTY;
        }),
      )
      .subscribe();
  }

  clearNearestAirports(): void {
    this.nearestSub?.unsubscribe();
    this.nearestSub = null;
    this.mapStore.clearClosestAirports();
  }
}
