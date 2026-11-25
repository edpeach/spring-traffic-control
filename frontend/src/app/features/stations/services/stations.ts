import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, EMPTY, map, tap } from 'rxjs';
import { z } from 'zod';
import {
  Station,
  StationSchema,
  StationSyncRequest,
  StationSyncResultSchema,
} from '../models/station.model';
import { StationStore } from '../store/station.store';

const StationsListSchema = z.array(StationSchema);

@Service()
export class Stations {
  private readonly http = inject(HttpClient);
  private readonly store = inject(StationStore);

  loadAll(): void {
    this.store.setLoading(true);
    this.http
      .get<unknown>('/api/stations/airports')
      .pipe(
        map((raw) => StationsListSchema.parse(raw)),
        tap((stations) => this.store.setStations(stations)),
        catchError(() => {
          this.store.setError('Unable to load stations. Please ensure the backend is running.');
          return EMPTY;
        }),
      )
      .subscribe();
  }

  loadDetail(code: string): void {
    this.store.setDetailLoading(true);
    this.http
      .get<unknown>(`/api/stations/airports/${encodeURIComponent(code)}`)
      .pipe(
        map((raw): Station => StationSchema.parse(raw)),
        tap((station) => this.store.setSelectedStation(station)),
        catchError(() => {
          this.store.setSelectedStation(null);
          this.store.setError(`Station "${code}" could not be loaded.`);
          return EMPTY;
        }),
      )
      .subscribe();
  }

  syncFromOpenAip(request: StationSyncRequest): void {
    this.store.setSyncing(true);
    this.http
      .post<unknown>('/api/stations/airports/sync', request)
      .pipe(
        map((raw) => StationSyncResultSchema.parse(raw)),
        tap((result) => {
          this.store.setSyncMessage(
            `Synced ${result.syncedCount} station(s) from OpenAIP (${result.pagesFetched} page(s), ${result.totalAvailable} matching).`,
          );
          this.loadAll();
        }),
        catchError((err: unknown) => {
          const message =
            err instanceof HttpErrorResponse && typeof err.error?.message === 'string'
              ? err.error.message
              : 'OpenAIP sync failed. Verify OPENAIP_API_KEY and backend connectivity.';
          this.store.setError(message);
          return EMPTY;
        }),
      )
      .subscribe();
  }
}
