import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { StationStore } from '../store/station.store';
import { Stations } from './stations';

describe('Stations', () => {
  let service: Stations;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(Stations);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads all stations into StationStore', () => {
    const store = TestBed.inject(StationStore);
    service.loadAll();

    const req = httpMock.expectOne('/api/stations/airports');
    req.flush([]);
    expect(store.loading()).toBe(false);
    expect(store.stations()).toEqual([]);
  });

  it('syncs stations from OpenAIP and reloads the store', () => {
    const store = TestBed.inject(StationStore);
    service.syncFromOpenAip({ country: 'NL', limit: 100, maxPages: 5 });

    const syncReq = httpMock.expectOne('/api/stations/airports/sync');
    expect(syncReq.request.method).toBe('POST');
    expect(syncReq.request.body).toEqual({ country: 'NL', limit: 100, maxPages: 5 });
    syncReq.flush({ syncedCount: 12, pagesFetched: 1, totalAvailable: 12 });

    const reloadReq = httpMock.expectOne('/api/stations/airports');
    reloadReq.flush([]);

    expect(store.syncing()).toBe(false);
    expect(store.syncMessage()).toContain('Synced 12 station(s)');
  });
});
