import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { StationsPage } from './stations-page';

describe('StationsPage', () => {
  let component: StationsPage;
  let fixture: ComponentFixture<StationsPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StationsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StationsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('fetches all stations and toggles between table and cards views', () => {
    const req = httpMock.expectOne('/api/stations/airports');
    req.flush([
      {
        id: 'eham',
        kind: 'AIRPORT',
        name: 'Schiphol',
        country: 'NL',
        icao: 'EHAM',
        iata: 'AMS',
        ppr: false,
        isPrivate: false,
        skydiveActivity: false,
        winchOnly: false,
        openingHours: { alwaysOpen: true },
        maxAircraftCategory: 'WIDE_BODY',
        runwayCount: 6,
        emergencyMedicalCapable: true,
        runways: [],
        frequencies: [],
      },
    ]);
    fixture.detectChanges();

    expect(component.store.totalCount()).toBe(1);
    expect(component.store.viewMode()).toBe('table');

    component.setViewMode('cards');
    fixture.detectChanges();
    expect(component.store.viewMode()).toBe('cards');
    expect(component.cardRows().length).toBe(1);
  });
});
