import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { StationDetailPage } from './station-detail-page';

describe('StationDetailPage', () => {
  let fixture: ComponentFixture<StationDetailPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StationDetailPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ code: 'EHAM' })) },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(StationDetailPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads and displays full station details including runways and frequencies', () => {
    const req = httpMock.expectOne('/api/stations/airports/EHAM');
    req.flush({
      id: 'eham',
      kind: 'AIRPORT',
      name: 'Amsterdam Airport Schiphol',
      country: 'NL',
      icao: 'EHAM',
      iata: 'AMS',
      ppr: false,
      isPrivate: false,
      skydiveActivity: false,
      winchOnly: false,
      openingHours: { alwaysOpen: true },
      maxAircraftCategory: 'WIDE_BODY',
      runwayCount: 1,
      primaryFrequency: '119.230',
      emergencyMedicalCapable: true,
      runways: [
        {
          id: 'r1',
          designator: '18R',
          trueHeading: 183,
          mainRunway: true,
          takeOffOnly: false,
          landingOnly: false,
          lengthMeters: 3800,
          widthMeters: 60,
          surfaceType: 'ASPHALT',
          pilotControlledLighting: false,
        },
      ],
      frequencies: [
        {
          id: 'f1',
          value: '119.230',
          type: 'TOWER',
          name: 'Schiphol Tower',
          primary: true,
          publicUse: true,
        },
      ],
    });
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Amsterdam Airport Schiphol');
    expect(text).toContain('18R');
    expect(text).toContain('119.230 MHz');
  });
});
