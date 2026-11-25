import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { catchError, EMPTY, map, tap } from 'rxjs';
import { z } from 'zod';
import {
  ScheduledFlightSchema,
  ScheduleSyncRequest,
  ScheduleSyncResultSchema,
} from '../models/schedule.model';
import { ScheduleStore } from '../store/schedule.store';

const ScheduledFlightsListSchema = z.array(ScheduledFlightSchema);

@Service()
export class Schedule {
  private readonly http = inject(HttpClient);
  private readonly store = inject(ScheduleStore);

  loadAll(scheduleDate?: string): void {
    this.store.setLoading(true);
    let params = new HttpParams();
    if (scheduleDate) {
      params = params.set('scheduleDate', scheduleDate);
    }

    this.http
      .get<unknown>('/api/schedule', { params })
      .pipe(
        map((raw) => ScheduledFlightsListSchema.parse(raw)),
        tap((flights) => this.store.setFlights(flights)),
        catchError(() => {
          this.store.setError(
            'Unable to load flight schedule. Please ensure the backend is running.',
          );
          return EMPTY;
        }),
      )
      .subscribe();
  }

  loadByFlightName(flightName: string): void {
    this.store.setDetailLoading(true);
    this.http
      .get<unknown>(`/api/schedule/${encodeURIComponent(flightName)}`)
      .pipe(
        map((raw) => ScheduledFlightsListSchema.parse(raw)),
        tap((matches) => this.store.setSelectedFlightMatches(matches)),
        catchError(() => {
          this.store.setSelectedFlightMatches([]);
          this.store.setError(`Scheduled flight "${flightName}" could not be loaded.`);
          return EMPTY;
        }),
      )
      .subscribe();
  }

  syncDay(request: ScheduleSyncRequest): void {
    this.store.setSyncing(true);
    this.http
      .post<unknown>('/api/schedule/sync', request)
      .pipe(
        map((raw) => ScheduleSyncResultSchema.parse(raw)),
        tap((result) => {
          this.store.setSyncMessage(
            `Synced ${result.syncedCount} scheduled flight(s) for ${result.scheduleDate} (${result.pagesFetched} page(s)).`,
          );
          this.loadAll();
        }),
        catchError((err: unknown) => {
          const message =
            err instanceof HttpErrorResponse && typeof err.error?.message === 'string'
              ? err.error.message
              : 'Schiphol schedule sync failed. Verify Schiphol credentials and backend connectivity.';
          this.store.setError(message);
          return EMPTY;
        }),
      )
      .subscribe();
  }
}
