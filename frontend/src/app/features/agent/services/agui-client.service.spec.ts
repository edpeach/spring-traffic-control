import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { ScheduledFlight } from '../../flights/models/schedule.model';
import { ScheduleStore } from '../../flights/store/schedule.store';
import { Station } from '../../stations/models/station.model';
import { StationStore } from '../../stations/store/station.store';
import { AguiClientService } from './agui-client.service';

describe('AguiClientService', () => {
  let service: AguiClientService;
  let router: Router;
  let stationStore: InstanceType<typeof StationStore>;
  let scheduleStore: InstanceType<typeof ScheduleStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AguiClientService);
    router = TestBed.inject(Router);
    stationStore = TestBed.inject(StationStore);
    scheduleStore = TestBed.inject(ScheduleStore);
  });

  it('includes the viewed station in uiState when on station-detail page', () => {
    vi.spyOn(router, 'url', 'get').mockReturnValue('/stations/EHAM');
    const schiphol: Station = {
      id: 'st-eham',
      kind: 'AIRPORT',
      name: 'Amsterdam Airport Schiphol',
      city: 'Amsterdam',
      country: 'NL',
      iata: 'AMS',
      icao: 'EHAM',
      latitude: 52.3105,
      longitude: 4.7683,
      elevationMeters: -3,
      airportType: 'INTL_APT',
      trafficTypes: ['IFR', 'VFR'],
      ppr: false,
      isPrivate: false,
      skydiveActivity: false,
      winchOnly: false,
      timezone: 'Europe/Amsterdam',
      contactPhone: null,
      contactEmail: null,
      openingHours: { alwaysOpen: true, openUtc: null, closeUtc: null },
      maxRunwayMeters: 3800,
      maxAircraftCategory: 'WIDE_BODY',
      runwayCount: 6,
      primaryFrequency: '119.225',
      emergencyMedicalCapable: true,
      runways: [],
      frequencies: [],
    };
    stationStore.setSelectedStation(schiphol);

    const uiState = service.buildUiStateContext();

    expect(uiState['currentPage']).toBe('station-detail');
    expect(uiState['selectedStations']).toEqual([
      {
        code: 'EHAM',
        name: 'Amsterdam Airport Schiphol',
        icao: 'EHAM',
        iata: 'AMS',
        city: 'Amsterdam',
        country: 'NL',
        primary: true,
      },
    ]);
  });

  it('falls back to route code on station-detail page before store finishes loading', () => {
    vi.spyOn(router, 'url', 'get').mockReturnValue('/stations/EHRD');

    const uiState = service.buildUiStateContext();

    expect(uiState['currentPage']).toBe('station-detail');
    expect(uiState['selectedStations']).toEqual([
      {
        code: 'EHRD',
        name: null,
        icao: null,
        iata: null,
        city: null,
        country: null,
        primary: true,
      },
    ]);
  });

  it('includes the viewed flight in uiState when on flight-detail page', () => {
    vi.spyOn(router, 'url', 'get').mockReturnValue('/flights/KL0702');
    const flight: ScheduledFlight = {
      id: 'fl-kl0702',
      flightName: 'KL0702',
      flightNumber: 702,
      mainFlight: 'KL0702',
      flightDirection: 'A',
      prefixIata: 'KL',
      prefixIcao: 'KLM',
      airlineCode: 100,
      isOperationalFlight: true,
      serviceType: 'J',
      originCode: 'SCL',
      destinationCode: 'AMS',
      routeDestinations: ['SCL'],
      routeEu: 'N',
      routeVisa: false,
      aircraftRegistration: 'PH-BKA',
      aircraftIataMain: '789',
      aircraftIataSub: '789',
      scheduleDate: '2026-11-25',
      scheduleTime: '14:30:00',
      scheduleDateTime: '2026-11-25T14:30:00Z',
      estimatedLandingTime: null,
      actualLandingTime: null,
      publicEstimatedOffBlockTime: null,
      actualOffBlockTime: null,
      expectedTimeGateOpen: null,
      expectedTimeBoarding: null,
      expectedTimeGateClosing: null,
      expectedTimeOnBelt: null,
      expectedSecurityFilter: null,
      lastUpdatedAt: null,
      terminal: 2,
      pier: 'E',
      gate: 'E14',
      flightStates: ['AIR'],
      codeshares: [],
      baggageBelts: [],
      transferPositions: [],
      checkinRows: [],
      checkinStartTime: null,
      checkinEndTime: null,
      checkinAllocations: [],
    };
    scheduleStore.setSelectedFlightMatches([flight]);

    const uiState = service.buildUiStateContext();

    expect(uiState['currentPage']).toBe('flight-detail');
    expect(uiState['selectedScheduledFlight']).toEqual({
      flightName: 'KL0702',
      originCode: 'SCL',
      destinationCode: 'AMS',
      flightDirection: 'A',
      gate: 'E14',
    });
  });
});
