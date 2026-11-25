import { TestBed } from '@angular/core/testing';
import { ScheduleStore } from '../../../flights/store/schedule.store';
import { FlightStatesLayerStore } from './flight-states.store';

describe('FlightStatesLayerStore', () => {
  let store: InstanceType<typeof FlightStatesLayerStore>;
  let scheduleStore: InstanceType<typeof ScheduleStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(FlightStatesLayerStore);
    scheduleStore = TestBed.inject(ScheduleStore);
    scheduleStore.setFlights([]);
  });

  it('matches only overlapping trimmed callsigns and excludes aircraft serving another flight', () => {
    store.setArrivals([
      {
        icao24: '484f99',
        callsign: ' BAW428 ',
        firstSeen: 1700000000,
        lastSeen: 1700003600,
        estDepartureAirport: 'EGLL',
        estArrivalAirport: 'EHAM',
      },
      {
        icao24: '484f88',
        callsign: 'KLM100 ',
        firstSeen: 1700000000,
        lastSeen: 1700003600,
        estDepartureAirport: 'LEMD',
        estArrivalAirport: 'EHAM',
      },
    ]);
    store.setDepartures([]);
    store.setStates([
      {
        icao24: '484f99',
        callsign: 'BAW428  ',
        latitude: 52.1,
        longitude: 4.5,
        onGround: false,
        spi: false,
      },
      {
        // Same icao24 as KLM100 arrival, but now serving a different flight callsign
        icao24: '484f88',
        callsign: 'KLM999',
        latitude: 50.0,
        longitude: 8.5,
        onGround: false,
        spi: false,
      },
      {
        // Blank callsign should not match
        icao24: '484f99',
        callsign: '   ',
        latitude: 52.2,
        longitude: 4.6,
        onGround: false,
        spi: false,
      },
    ]);

    const flights = store.liveFlights();
    expect(flights.length).toBe(1);
    expect(flights[0].state.icao24).toBe('484f99');
    expect(flights[0].displayCallsign).toBe('BAW428');
    expect(flights[0].direction).toBe('A');
  });

  it('classifies arrival when estArrivalAirport is EHAM and departure when estArrivalAirport is not EHAM', () => {
    store.setArrivals([
      {
        icao24: '484f01',
        callsign: 'KLM101',
        firstSeen: 1700000000,
        lastSeen: 1700001000,
        estDepartureAirport: null,
        estArrivalAirport: 'EHAM',
      },
      {
        // Even if estDepartureAirport is null, non-EHAM estArrivalAirport indicates a departure
        icao24: '484f02',
        callsign: 'KLM102',
        firstSeen: 1700000000,
        lastSeen: 1700001000,
        estDepartureAirport: null,
        estArrivalAirport: 'EGBB',
      },
    ]);
    store.setDepartures([
      {
        icao24: '484f03',
        callsign: 'KLM103',
        firstSeen: 1700000000,
        lastSeen: 1700001000,
        estDepartureAirport: 'EHAM',
        estArrivalAirport: null,
      },
    ]);
    store.setStates([
      {
        icao24: '484f01',
        callsign: 'KLM101',
        latitude: 52.3,
        longitude: 4.7,
        onGround: false,
        spi: false,
      },
      {
        icao24: '484f02',
        callsign: 'KLM102',
        latitude: 52.4,
        longitude: 3.1,
        onGround: false,
        spi: false,
      },
      {
        icao24: '484f03',
        callsign: 'KLM103',
        latitude: 52.2,
        longitude: 4.9,
        onGround: false,
        spi: false,
      },
    ]);

    const byCallsign = new Map(store.liveFlights().map((f) => [f.displayCallsign, f]));
    expect(byCallsign.get('KLM101')?.direction).toBe('A');
    expect(byCallsign.get('KLM102')?.direction).toBe('D');
    expect(byCallsign.get('KLM103')?.direction).toBe('D');
  });

  it('picks the matching leg by callsign when an airframe has both an arrival and departure', () => {
    store.setArrivals([
      {
        icao24: '484f71',
        callsign: 'KLM1050 ',
        firstSeen: 1700005000,
        lastSeen: 1700009000, // newer timestamp than departure, but different callsign
        estDepartureAirport: 'EGLL',
        estArrivalAirport: 'EHAM',
      },
    ]);
    store.setDepartures([
      {
        icao24: '484f71',
        callsign: ' KLM1051',
        firstSeen: 1700001000,
        lastSeen: 1700004000,
        estDepartureAirport: 'EHAM',
        estArrivalAirport: 'EGBB',
      },
    ]);
    store.setStates([
      {
        icao24: '484f71',
        callsign: 'KLM1051 ',
        latitude: 52.35,
        longitude: 4.5,
        onGround: false,
        spi: false,
      },
    ]);

    const flights = store.liveFlights();
    expect(flights.length).toBe(1);
    expect(flights[0].direction).toBe('D');
    expect(flights[0].arrival).toBeNull();
    expect(flights[0].departure?.callsign?.trim()).toBe('KLM1051');
    expect(flights[0].destinationCode).toBe('EGBB');
  });

  it('includes airborne inbound flights matched by Schiphol schedule even before OpenSky /flights/arrival lists them', () => {
    scheduleStore.setFlights([
      {
        id: 'arr-1',
        flightName: 'KL1008',
        flightNumber: 1008,
        mainFlight: 'KL1008',
        flightDirection: 'A',
        prefixIata: 'KL',
        prefixIcao: 'KLM',
        isOperationalFlight: true,
        originCode: 'LHR',
        destinationCode: 'AMS',
        routeDestinations: ['LHR'],
        flightStates: ['AIR'],
        codeshares: [],
        baggageBelts: [],
        transferPositions: [],
        checkinRows: [],
        checkinAllocations: [],
      },
    ]);
    store.setArrivals([]);
    store.setDepartures([]);
    store.setStates([
      {
        icao24: '484f55',
        callsign: ' KLC1008 ',
        latitude: 52.0,
        longitude: 2.5,
        onGround: false,
        spi: false,
      },
    ]);

    const flights = store.liveFlights();
    expect(flights.length).toBe(1);
    expect(flights[0].direction).toBe('A');
    expect(flights[0].originCode).toBe('LHR');
    expect(flights[0].destinationCode).toBe('AMS');
    expect(flights[0].schedule?.flightName).toBe('KL1008');
  });
});
