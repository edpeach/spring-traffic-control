import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { MapStore } from '../../store/map.store';
import { MapPage } from './map-page';

describe('MapPage', () => {
  let component: MapPage;
  let fixture: ComponentFixture<MapPage>;
  let httpMock: HttpTestingController;
  let mapStore: InstanceType<typeof MapStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap({ station: 'EHAM' })) },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    mapStore = TestBed.inject(MapStore);
    fixture = TestBed.createComponent(MapPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads stations and schedule, opens left panel, and builds curved flight paths', () => {
    const stationsReq = httpMock.expectOne('/api/stations/airports');
    stationsReq.flush([
      {
        id: 'eham',
        kind: 'AIRPORT',
        name: 'Amsterdam Airport Schiphol',
        country: 'NL',
        icao: 'EHAM',
        iata: 'AMS',
        latitude: 52.3086,
        longitude: 4.7639,
        elevationMeters: -3,
        airportType: 'INTL_APT',
        ppr: false,
        isPrivate: false,
        skydiveActivity: false,
        winchOnly: false,
        openingHours: { alwaysOpen: true },
        maxAircraftCategory: 'WIDE_BODY',
        runwayCount: 6,
        primaryFrequency: '119.230',
        emergencyMedicalCapable: true,
        runways: [],
        frequencies: [],
      },
      {
        id: 'egbb',
        kind: 'AIRPORT',
        name: 'Birmingham Airport',
        country: 'GB',
        icao: 'EGBB',
        iata: 'BHX',
        latitude: 52.4539,
        longitude: -1.748,
        elevationMeters: 99,
        airportType: 'INTL_APT',
        ppr: false,
        isPrivate: false,
        skydiveActivity: false,
        winchOnly: false,
        openingHours: { alwaysOpen: true },
        maxAircraftCategory: 'WIDE_BODY',
        runwayCount: 1,
        emergencyMedicalCapable: true,
        runways: [],
        frequencies: [],
      },
    ]);

    const scheduleReq = httpMock.expectOne('/api/schedule');
    scheduleReq.flush([
      {
        id: 'f1',
        flightName: 'KL1051',
        flightNumber: 1051,
        prefixIcao: 'KLM',
        mainFlight: 'KL1051',
        flightDirection: 'D',
        originCode: 'AMS',
        destinationCode: 'BHX',
        scheduleDateTime: '2026-11-21T20:05:00Z',
        flightStates: ['GTD'],
        codeshares: [],
      },
    ]);

    const arrivalsReq = httpMock.expectOne('/api/flights/arrival?airport=EHAM');
    arrivalsReq.flush([
      {
        icao24: '484f99',
        callsign: 'BAW428',
        firstSeen: 1700000000,
        lastSeen: 1700003600,
        estDepartureAirport: 'EGLL',
        estArrivalAirport: 'EHAM',
      },
    ]);

    const departuresReq = httpMock.expectOne('/api/flights/departure?airport=EHAM');
    departuresReq.flush([
      {
        icao24: '484f71',
        callsign: 'KLM1051',
        firstSeen: 1700001000,
        lastSeen: 1700004600,
        estDepartureAirport: 'EHAM',
        estArrivalAirport: 'EGBB',
      },
    ]);

    const statesReq = httpMock.expectOne('/api/states/all');
    statesReq.flush([
      {
        icao24: '484f71',
        callsign: 'KLM1051',
        originCountry: 'Netherlands',
        longitude: 4.5,
        latitude: 52.35,
        baroAltitude: 8500,
        onGround: false,
        velocity: 210,
        trueTrack: 275,
      },
      {
        icao24: '484f99',
        callsign: 'BAW428',
        originCountry: 'United Kingdom',
        longitude: 3.1,
        latitude: 51.9,
        baroAltitude: 6200,
        onGround: false,
        velocity: 195,
        trueTrack: 60,
      },
      {
        icao24: 'aaaaaa',
        callsign: 'UNRELATED1',
        originCountry: 'France',
        longitude: 2.3,
        latitude: 48.8,
        baroAltitude: 10000,
        onGround: false,
      },
    ]);
    fixture.detectChanges();

    expect(mapStore.panelOpen()).toBe(true);
    expect(component.selectedStation()?.icao).toBe('EHAM');
    expect(component.stationsLayerStore.geoJson().features.length).toBe(2);
    expect(component.stationsLayerStore.geoJson().features[0].properties?.['highlighted']).toBe(
      true,
    );
    expect(component.stationsLayerStore.geoJson().features[0].properties?.['label']).toBe('EHAM');

    component.stationStore.setCodeDisplay('iata');
    expect(component.stationsLayerStore.geoJson().features[0].properties?.['label']).toBe('AMS');

    const paths = component.flightPathsLayerStore.geoJson().features;
    expect(paths.length).toBe(1);
    expect(paths[0].properties['flightName']).toBe('KL1051');
    expect(paths[0].geometry.coordinates[0].length).toBeGreaterThan(2);

    // Only arriving/departing EHAM flights are plotted (UNRELATED1 excluded)
    const liveFeatures = component.flightStatesLayerStore.geoJson().features;
    expect(liveFeatures.length).toBe(2);

    // Select KLM1051 -> highlighted, linked to Schiphol KL1051 via prefixIcao+flightNumber, other flight dimmed
    // AND dynamically adds the 'flight-track' layer with flown path + line to destination airport
    component.flightStatesLayerStore.selectFlightState('484f71');
    mapStore.selectFlightState('484f71');
    fixture.detectChanges();

    expect(mapStore.layerOrder()).toContain('flight-track');

    const trackReq = httpMock.expectOne('/api/tracks?icao24=484f71');
    trackReq.flush({
      icao24: '484f71',
      callsign: 'KLM1051',
      path: [
        {
          time: 1700001000,
          latitude: 52.3086,
          longitude: 4.7639,
          baroAltitude: 100,
          trueTrack: 270,
          onGround: false,
        },
        {
          time: 1700001600,
          latitude: 52.35,
          longitude: 4.5,
          baroAltitude: 8500,
          trueTrack: 275,
          onGround: false,
        },
      ],
      fromStation: null,
      toStation: null,
      remainingPath: [],
    });
    fixture.detectChanges();

    const selected = component.selectedFlightState();
    expect(selected?.schedule?.flightName).toBe('KL1051');
    expect(selected?.direction).toBe('D');
    expect(selected?.originCode).toBe('EHAM');
    expect(selected?.destinationCode).toBe('EGBB');
    expect(selected?.departure?.estArrivalAirport).toBe('EGBB');

    // Selecting a live flight zooms the camera to its coordinates
    expect(mapStore.cameraTarget()).toEqual({
      longitude: selected!.state.longitude!,
      latitude: selected!.state.latitude!,
      zoom: 8,
    });

    // Adding closest airports switches the camera to fitBounds covering flight + airports
    mapStore.setClosestAirports([
      {
        station: component.stationStore.stations()[0],
        distanceKm: 18.5,
      },
      {
        station: component.stationStore.stations()[1],
        distanceKm: 420.0,
      },
    ]);
    fixture.detectChanges();
    expect(mapStore.cameraTarget()).toBeNull();
    expect(mapStore.cameraBounds()).toEqual({
      sw: [-1.748, 52.3086],
      ne: [4.7639, 52.4539],
      maxZoom: 10,
    });

    const flownFeatures = component.flightTrackLayerStore.flownGeoJson().features;
    expect(flownFeatures.length).toBe(1);
    expect(flownFeatures[0].geometry.coordinates[0].length).toBe(2);

    const remainingFeatures = component.flightTrackLayerStore.remainingGeoJson().features;
    expect(remainingFeatures.length).toBe(1);
    const remainingLine = remainingFeatures[0].geometry.coordinates[0];
    expect(remainingLine.length).toBeGreaterThan(2);
    // Remaining line terminates at EGBB (estArrivalAirport) coordinates [-1.748, 52.4539]
    const lastCoord = remainingLine[remainingLine.length - 1];
    expect(lastCoord[0]).toBeCloseTo(-1.748, 2);
    expect(lastCoord[1]).toBeCloseTo(52.4539, 2);

    const updatedFeatures = component.flightStatesLayerStore.geoJson().features;
    const klmFeature = updatedFeatures.find((f) => f.properties['icao24'] === '484f71');
    const bawFeature = updatedFeatures.find((f) => f.properties['icao24'] === '484f99');
    expect(klmFeature?.properties['highlighted']).toBe(true);
    expect(klmFeature?.properties['dimmed']).toBe(false);
    expect(bawFeature?.properties['highlighted']).toBe(false);
    expect(bawFeature?.properties['dimmed']).toBe(true);

    // Clearing selection removes the dynamic flight-track layer
    component.clearSelection();
    fixture.detectChanges();
    expect(mapStore.layerOrder()).not.toContain('flight-track');
    expect(component.flightTrackLayerStore.flownGeoJson().features.length).toBe(0);
    expect(component.flightTrackLayerStore.remainingGeoJson().features.length).toBe(0);

    // Clicking away from any interactive layer clears selections across all layer stores
    component.stationsLayerStore.selectStation('EHAM');
    component.flightPathsLayerStore.selectFlight('KL1051');
    component.flightStatesLayerStore.selectFlightState('484f71');
    mapStore.selectStation('EHAM');
    fixture.detectChanges();

    const fakeMap = {
      getLayer: () => ({ id: 'stations-icon' }),
      queryRenderedFeatures: () => [],
    };
    (component as unknown as { handleMapClick: (m: unknown, e: unknown) => void }).handleMapClick(
      fakeMap,
      { point: { x: 10, y: 10 } },
    );
    fixture.detectChanges();

    expect(mapStore.selectedItem()).toBeNull();
    expect(component.stationsLayerStore.selectedStation()).toBeNull();
    expect(component.flightPathsLayerStore.selectedFlight()).toBeNull();
    expect(component.flightStatesLayerStore.selectedFlight()).toBeNull();
  });
});
