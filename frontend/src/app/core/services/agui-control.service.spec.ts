import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AgentChatStore } from '../../features/agent/store/agent-chat.store';
import { MapStore } from '../../features/map/store/map.store';
import { StationStore } from '../../features/stations/store/station.store';
import { AguiControlService } from './agui-control.service';
import { Theme } from './theme';

describe('AguiControlService', () => {
  let service: AguiControlService;
  let httpTesting: HttpTestingController;
  let router: Router;
  let mapStore: InstanceType<typeof MapStore>;
  let chatStore: InstanceType<typeof AgentChatStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    service = TestBed.inject(AguiControlService);
    httpTesting = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    mapStore = TestBed.inject(MapStore);
    chatStore = TestBed.inject(AgentChatStore);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('syncs capabilities and loads available providers on startup', async () => {
    const promise = service.syncCapabilities();

    const syncReq = httpTesting.expectOne('/api/agui/sync');
    expect(syncReq.request.method).toBe('POST');
    syncReq.flush({ appVersion: '0.1.0', surfaceCount: 3, actionCount: 6 });

    const providersReq = httpTesting.expectOne('/api/agui/providers');
    expect(providersReq.request.method).toBe('GET');
    providersReq.flush([
      { id: 'OLLAMA', label: 'Ollama (Local)', model: 'gemma4', available: true, default: false },
      {
        id: 'GEMINI',
        label: 'Google Gemini',
        model: 'gemini-3.8-flash',
        available: true,
        default: true,
      },
    ]);

    await promise;
    expect(chatStore.provider()).toBe('GEMINI');
    expect(chatStore.providers().length).toBe(2);
  });

  it('executes navigate and showClosestAirportsOnMap actions via effect queue', () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    service.enqueueAction({
      action: 'showClosestAirportsOnMap',
      params: { icao24: '484162', limit: 5, stationCodes: ['EHAM'] },
    });
    TestBed.tick();

    expect(navigateSpy).toHaveBeenCalledWith('/map');
    expect(mapStore.selectedItem()).toEqual({ kind: 'flight-state', icao24: '484162' });

    const nearestReq = httpTesting.expectOne(
      '/api/flights/opensky/484162/nearest-airports?limit=5&emergency=false',
    );
    nearestReq.flush([]);
  });

  it('executes setTheme and setColorMode actions (explicit and toggle)', () => {
    const theme = TestBed.inject(Theme);
    expect(theme.theme()).toBe('spring');
    expect(theme.mode()).toBe('dark');

    service.enqueueAction({ action: 'setTheme', params: { theme: 'Autumn' } });
    TestBed.tick();
    expect(theme.theme()).toBe('autumn');

    service.enqueueAction({ action: 'setTheme', params: {} });
    TestBed.tick();
    expect(theme.theme()).toBe('winter');

    service.enqueueAction({ action: 'setColorMode', params: { mode: 'light' } });
    TestBed.tick();
    expect(theme.mode()).toBe('light');

    service.enqueueAction({ action: 'setColorMode', params: {} });
    TestBed.tick();
    expect(theme.mode()).toBe('dark');
  });

  it('toggles map layers by human-friendly name or alias', () => {
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    expect(mapStore.layerVisibility()['day-night']).toBe(true);
    service.enqueueAction({
      action: 'toggleMapLayer',
      params: { name: 'Day / Night', visible: false },
    });
    TestBed.tick();
    expect(mapStore.layerVisibility()['day-night']).toBe(false);

    expect(mapStore.layerVisibility()['flight-paths']).toBe(false);
    service.enqueueAction({ action: 'toggleMapLayer', params: { layer: 'Flight Paths' } });
    TestBed.tick();
    expect(mapStore.layerVisibility()['flight-paths']).toBe(true);

    expect(mapStore.layerVisibility()['stations']).toBe(true);
    service.enqueueAction({ action: 'toggleMapLayer', params: { layerId: 'Airports' } });
    TestBed.tick();
    expect(mapStore.layerVisibility()['stations']).toBe(false);
  });

  it('navigates to /map, selects station, and flies to coordinates on selectStationOnMap', () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const stationStore = TestBed.inject(StationStore);
    stationStore.setSelectedStation({
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
      trafficTypes: ['IFR'],
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
    });

    service.enqueueAction({ action: 'selectStationOnMap', params: { code: 'EHAM' } });
    TestBed.tick();

    expect(navigateSpy).toHaveBeenCalledWith('/map');
    expect(mapStore.selectedItem()).toEqual({ kind: 'station', code: 'EHAM' });
    expect(mapStore.cameraTarget()).toEqual({
      longitude: 4.7683,
      latitude: 52.3105,
      zoom: expect.any(Number),
    });
  });
});
