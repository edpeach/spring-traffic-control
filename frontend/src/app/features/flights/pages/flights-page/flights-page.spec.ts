import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FlightsPage } from './flights-page';

describe('FlightsPage', () => {
  let component: FlightsPage;
  let fixture: ComponentFixture<FlightsPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlightsPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FlightsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads flights, sorts by scheduled time, and links turnarounds by registration', () => {
    const req = httpMock.expectOne('/api/schedule');
    req.flush([
      {
        id: 'dep-1',
        flightName: 'KL1051',
        mainFlight: 'KL1051',
        flightDirection: 'D',
        originCode: 'AMS',
        destinationCode: 'BHX',
        aircraftRegistration: 'PHNXD',
        aircraftIataMain: 'EMJ',
        aircraftIataSub: '295',
        scheduleDateTime: '2026-11-21T20:05:00Z',
        gate: 'D6',
        flightStates: ['GTD'],
        codeshares: ['VS6946'],
      },
      {
        id: 'arr-1',
        flightName: 'KL1050',
        mainFlight: 'KL1050',
        flightDirection: 'A',
        originCode: 'BHX',
        destinationCode: 'AMS',
        aircraftRegistration: 'PHNXD',
        aircraftIataMain: 'EMJ',
        aircraftIataSub: '295',
        scheduleDateTime: '2026-11-21T19:00:00Z',
        gate: 'D6',
        flightStates: ['ARR'],
        codeshares: [],
      },
      {
        id: 'dep-departed',
        flightName: 'KL1002',
        mainFlight: 'KL1002',
        flightDirection: 'D',
        originCode: 'AMS',
        destinationCode: 'LHR',
        aircraftRegistration: 'PHBXA',
        scheduleDateTime: '2026-11-21T18:00:00Z',
        actualOffBlockTime: '2026-11-21T18:02:00Z',
        gate: 'D2',
        flightStates: ['DEP'],
        codeshares: [],
      },
    ]);
    fixture.detectChanges();

    expect(component.store.filteredFlights().map((f) => f.flightName)).toEqual([
      'KL1002',
      'KL1050',
      'KL1051',
    ]);

    // Departed turnaround (PHBXA) is hidden by default
    expect(component.store.turnaroundPairs().map((p) => p.aircraftRegistration)).toEqual(['PHNXD']);
    const pair = component.store.turnaroundPairs()[0];
    expect(pair.arrival?.flightName).toBe('KL1050');
    expect(pair.departure?.flightName).toBe('KL1051');
    expect(pair.groundMinutes).toBe(65);

    // Toggling Show departed reveals PHBXA
    component.setShowDepartedTurnarounds(true);
    expect(component.store.turnaroundPairs().map((p) => p.aircraftRegistration)).toEqual([
      'PHBXA',
      'PHNXD',
    ]);

    component.setTurnaroundSortBy('departure');
    expect(component.store.turnaroundSortBy()).toBe('departure');

    component.setViewMode('cards');
    fixture.detectChanges();
    expect(component.store.viewMode()).toBe('cards');

    component.setViewMode('turnarounds');
    fixture.detectChanges();
    expect(component.store.viewMode()).toBe('turnarounds');
  });
});
