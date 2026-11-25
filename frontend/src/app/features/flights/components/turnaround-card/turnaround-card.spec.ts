import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TurnaroundPair } from '../../models/schedule.model';
import { TurnaroundCard } from './turnaround-card';

const MOCK_PAIR: TurnaroundPair = {
  key: 'PHNXD-1-2',
  aircraftRegistration: 'PHNXD',
  aircraftType: 'EMJ / 295',
  gate: 'D6',
  pier: 'D',
  terminal: 2,
  arrival: {
    id: '1',
    flightName: 'KL1050',
    flightDirection: 'A',
    isOperationalFlight: true,
    originCode: 'BHX',
    destinationCode: 'AMS',
    routeDestinations: ['BHX'],
    aircraftRegistration: 'PHNXD',
    scheduleDateTime: '2026-11-21T19:00:00Z',
    flightStates: ['ARR'],
    codeshares: [],
    baggageBelts: ['14'],
    transferPositions: [],
    checkinRows: [],
    checkinAllocations: [],
  },
  departure: {
    id: '2',
    flightName: 'KL1051',
    flightDirection: 'D',
    isOperationalFlight: true,
    originCode: 'AMS',
    destinationCode: 'BHX',
    routeDestinations: ['BHX'],
    aircraftRegistration: 'PHNXD',
    scheduleDateTime: '2026-11-21T20:05:00Z',
    gate: 'D6',
    flightStates: ['GTD'],
    codeshares: [],
    baggageBelts: [],
    transferPositions: [],
    checkinRows: ['9'],
    checkinAllocations: [],
  },
  groundMinutes: 65,
  hasDeparted: false,
  sortTimeMs: Date.parse('2026-11-21T19:00:00Z'),
};

describe('TurnaroundCard', () => {
  let fixture: ComponentFixture<TurnaroundCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TurnaroundCard],
    }).compileComponents();

    fixture = TestBed.createComponent(TurnaroundCard);
    fixture.componentRef.setInput('pair', MOCK_PAIR);
    fixture.detectChanges();
  });

  it('renders arrival and departure FlightCards around the aircraft/gate div without an outer card', () => {
    const hostEl = fixture.nativeElement as HTMLElement;
    expect(hostEl.querySelectorAll('app-flight-card').length).toBe(2);
    expect(hostEl.firstElementChild?.tagName).toBe('DIV');

    const text = hostEl.textContent ?? '';
    expect(text).toContain('KL1050');
    expect(text).toContain('PHNXD');
    expect(text).toContain('Gate D6');
    expect(text).toContain('65m ground');
    expect(text).toContain('KL1051');
  });
});
