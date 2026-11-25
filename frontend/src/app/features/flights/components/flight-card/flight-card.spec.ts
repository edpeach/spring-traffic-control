import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ScheduledFlight } from '../../models/schedule.model';
import { FlightCard } from './flight-card';

const MOCK_FLIGHT: ScheduledFlight = {
  id: '146259647587066693',
  flightName: 'VS6946',
  flightNumber: 6946,
  mainFlight: 'KL1051',
  flightDirection: 'D',
  prefixIata: 'VS',
  prefixIcao: 'VIR',
  airlineCode: 181,
  isOperationalFlight: true,
  serviceType: 'J',
  originCode: 'AMS',
  destinationCode: 'BHX',
  routeDestinations: ['BHX'],
  routeEu: 'N',
  routeVisa: false,
  aircraftRegistration: 'PHNXD',
  aircraftIataMain: 'EMJ',
  aircraftIataSub: '295',
  scheduleDate: '2026-11-21',
  scheduleTime: '21:05:00',
  scheduleDateTime: '2026-11-21T20:05:00Z',
  terminal: 2,
  pier: 'D',
  gate: 'D6',
  flightStates: ['GTD'],
  codeshares: ['AM6204', 'VS6946'],
  baggageBelts: [],
  transferPositions: [],
  checkinRows: ['9', '10'],
  checkinAllocations: [],
};

describe('FlightCard', () => {
  let component: FlightCard;
  let fixture: ComponentFixture<FlightCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlightCard],
    }).compileComponents();

    fixture = TestBed.createComponent(FlightCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('flight', MOCK_FLIGHT);
    fixture.detectChanges();
  });

  it('renders flight info and expands codeshares and check-in rows', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('VS6946');
    expect(text).toContain('AMS → BHX');
    expect(text).toContain('PHNXD');

    component.toggleExpanded();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('AM6204');
  });
});
