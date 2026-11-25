import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Station } from '../../models/station.model';
import { StationCard } from './station-card';

const MOCK_STATION: Station = {
  id: 'eham',
  kind: 'AIRPORT',
  name: 'Amsterdam Airport Schiphol',
  city: 'Amsterdam',
  country: 'NL',
  iata: 'AMS',
  icao: 'EHAM',
  latitude: 52.3086,
  longitude: 4.7639,
  elevationMeters: -3,
  airportType: 'INTL_APT',
  trafficTypes: ['VFR', 'IFR'],
  ppr: true,
  isPrivate: false,
  skydiveActivity: true,
  winchOnly: false,
  timezone: 'Europe/Amsterdam',
  contactPhone: null,
  contactEmail: null,
  openingHours: { alwaysOpen: true, openUtc: null, closeUtc: null },
  maxRunwayMeters: 3800,
  maxAircraftCategory: 'WIDE_BODY',
  runwayCount: 6,
  primaryFrequency: '119.230',
  emergencyMedicalCapable: true,
  runways: [],
  frequencies: [],
};

describe('StationCard', () => {
  let component: StationCard;
  let fixture: ComponentFixture<StationCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StationCard],
    }).compileComponents();

    fixture = TestBed.createComponent(StationCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('station', MOCK_STATION);
    fixture.detectChanges();
  });

  it('renders primary station info and expands additional details on toggle', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Amsterdam Airport Schiphol');
    expect(text).toContain('EHAM');
    expect(text).toContain('AMS');
    expect(text).toContain('119.230 MHz');
    expect(component.expanded()).toBe(false);

    component.toggleExpanded();
    fixture.detectChanges();
    expect(component.expanded()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('WIDE_BODY');
  });

  it('emits showOnMap when the Show on map action is clicked', () => {
    let emitted: Station | undefined;
    component.showOnMap.subscribe((s) => (emitted = s));

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    );
    const mapButton = buttons.find((b) => b.textContent?.includes('Show on map'));
    expect(mapButton).toBeTruthy();
    mapButton?.click();

    expect(emitted?.icao).toBe('EHAM');
  });
});
