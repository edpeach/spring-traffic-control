import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ScheduleStore } from '../store/schedule.store';
import { Schedule } from './schedule';

describe('Schedule', () => {
  let service: Schedule;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Schedule);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads scheduled flights and syncs full day schedule', () => {
    const store = TestBed.inject(ScheduleStore);
    service.syncDay({
      scheduleDate: '2026-11-21',
      direction: null,
      includeDelays: false,
      maxPages: 500,
    });

    const syncReq = httpMock.expectOne('/api/schedule/sync');
    expect(syncReq.request.method).toBe('POST');
    syncReq.flush({ scheduleDate: '2026-11-21', syncedCount: 42, pagesFetched: 3 });

    const loadReq = httpMock.expectOne('/api/schedule');
    loadReq.flush([]);

    expect(store.syncing()).toBe(false);
    expect(store.syncMessage()).toContain('Synced 42 scheduled flight(s)');
  });
});
