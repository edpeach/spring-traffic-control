import {
  buildScheduleCallsignIndex,
  findLinkedSchedule,
  findScheduleByRouteAndTime,
} from './flight-state.model';
import { ScheduledFlight } from './schedule.model';

function makeFlight(overrides: Partial<ScheduledFlight>): ScheduledFlight {
  return {
    id: 'f-1',
    flightName: 'KL1051',
    flightNumber: 1051,
    mainFlight: 'KL1051',
    flightDirection: 'D',
    prefixIata: 'KL',
    prefixIcao: 'KLM',
    isOperationalFlight: true,
    routeDestinations: ['BHX'],
    flightStates: [],
    codeshares: [],
    baggageBelts: [],
    transferPositions: [],
    checkinRows: [],
    checkinAllocations: [],
    ...overrides,
  };
}

describe('findLinkedSchedule', () => {
  const flights: ScheduledFlight[] = [
    makeFlight({
      id: 'kl1051',
      flightName: 'KL1051',
      mainFlight: 'KL1051',
      flightNumber: 1051,
      prefixIata: 'KL',
      prefixIcao: 'KLM',
    }),
    makeFlight({
      id: 'kl0891',
      flightName: 'KL0891',
      mainFlight: 'KL0891',
      flightNumber: 891,
      prefixIata: 'KL',
      prefixIcao: 'KLM',
    }),
    makeFlight({
      id: 'u2428',
      flightName: 'U20428',
      mainFlight: 'U20428',
      flightNumber: 428,
      prefixIata: 'U2',
      prefixIcao: null,
    }),
    makeFlight({
      id: 'ba428',
      flightName: 'BA428',
      mainFlight: 'BA428',
      flightNumber: 428,
      prefixIata: 'BA',
      prefixIcao: 'BAW',
    }),
    makeFlight({
      id: 'kl1050',
      flightName: 'KL1050',
      mainFlight: 'KL1050',
      flightNumber: 1050,
      prefixIata: 'KL',
      prefixIcao: 'KLM',
    }),
  ];

  const index = buildScheduleCallsignIndex(flights);

  it('matches direct flightName and prefixIcao+flightNumber callsigns', () => {
    expect(findLinkedSchedule('KL1051', index)?.id).toBe('kl1051');
    expect(findLinkedSchedule(' KLM1051 ', index)?.id).toBe('kl1051');
  });

  it('matches subsidiary operating carrier ICAO prefixes via CALLSIGN_PREFIX_ALIASES', () => {
    expect(findLinkedSchedule('KLC1051', index)?.id).toBe('kl1051');
    expect(findLinkedSchedule('EJU0428', index)?.id).toBe('u2428');
    expect(findLinkedSchedule('CFE428', index)?.id).toBe('ba428');
  });

  it('normalizes leading zeros and trailing ATC deconfliction letters without corrupting internal zeros', () => {
    expect(findLinkedSchedule('KLM0891', index)?.id).toBe('kl0891');
    expect(findLinkedSchedule('KLC0891', index)?.id).toBe('kl0891');
    expect(findLinkedSchedule('BAW428A', index)?.id).toBe('ba428');
    expect(findLinkedSchedule('KLM1050', index)?.id).toBe('kl1050');
    expect(findLinkedSchedule('KL150', index)).toBeNull();
  });

  it('supports explicit CALLSIGN_OVERRIDES for alphanumeric ATC callsigns', () => {
    const matched = findLinkedSchedule('KLM42M', index, { KLM42M: 'KL1051' });
    expect(matched?.id).toBe('kl1051');
  });
});

describe('findScheduleByRouteAndTime', () => {
  const baseMs = Date.parse('2026-11-22T10:00:00Z');
  const flights: ScheduledFlight[] = [
    makeFlight({
      id: 'kl735-morning',
      flightName: 'KL735',
      mainFlight: 'KL735',
      flightNumber: 735,
      flightDirection: 'D',
      prefixIata: 'KL',
      prefixIcao: 'KLM',
      originCode: 'AMS',
      destinationCode: 'CUR',
      scheduleDateTime: '2026-11-22T10:00:00Z',
    }),
    makeFlight({
      id: 'kl737-evening',
      flightName: 'KL737',
      mainFlight: 'KL737',
      flightNumber: 737,
      flightDirection: 'D',
      prefixIata: 'KL',
      prefixIcao: 'KLM',
      originCode: 'AMS',
      destinationCode: 'CUR',
      scheduleDateTime: '2026-11-22T16:00:00Z',
    }),
    makeFlight({
      id: 'kl900-tie-a',
      flightName: 'KL900',
      mainFlight: 'KL900',
      flightNumber: 900,
      flightDirection: 'A',
      prefixIata: 'KL',
      prefixIcao: 'KLM',
      originCode: 'LHR',
      destinationCode: 'AMS',
      scheduleDateTime: '2026-11-22T10:00:00Z',
    }),
    makeFlight({
      id: 'kl902-tie-b',
      flightName: 'KL902',
      mainFlight: 'KL902',
      flightNumber: 902,
      flightDirection: 'A',
      prefixIata: 'KL',
      prefixIcao: 'KLM',
      originCode: 'LHR',
      destinationCode: 'AMS',
      scheduleDateTime: '2026-11-22T10:05:00Z',
    }),
  ];

  it('matches deconflicted ATC callsign KLM163 to KL735 by airline, direction, route, and closest time', () => {
    const matched = findScheduleByRouteAndTime(flights, {
      callsign: 'KLM163',
      direction: 'D',
      partnerAirportIata: 'CUR',
      referenceEpochSeconds: Math.floor((baseMs + 10 * 60 * 1000) / 1000),
    });

    expect(matched?.flightName).toBe('KL735');
  });

  it('returns null when multiple flights on the same route are too close in time to disambiguate', () => {
    const matched = findScheduleByRouteAndTime(flights, {
      callsign: 'KLM99Z',
      direction: 'A',
      partnerAirportIata: 'LHR',
      referenceEpochSeconds: Math.floor((baseMs + 2 * 60 * 1000) / 1000),
    });

    expect(matched).toBeNull();
  });
});
