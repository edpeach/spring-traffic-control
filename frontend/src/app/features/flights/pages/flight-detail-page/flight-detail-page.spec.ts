import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { FlightDetailPage } from './flight-detail-page';

describe('FlightDetailPage', () => {
  let fixture: ComponentFixture<FlightDetailPage>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlightDetailPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ flightName: 'VS6946' })) },
        },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(FlightDetailPage);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads and displays full scheduled flight details including codeshares and check-in desks', () => {
    const req = httpMock.expectOne('/api/schedule/VS6946');
    req.flush([
      {
        id: '146259647587066693',
        flightName: 'VS6946',
        mainFlight: 'KL1051',
        flightDirection: 'D',
        originCode: 'AMS',
        destinationCode: 'BHX',
        aircraftRegistration: 'PHNXD',
        aircraftIataMain: 'EMJ',
        aircraftIataSub: '295',
        scheduleDate: '2026-11-21',
        scheduleTime: '21:05:00',
        scheduleDateTime: '2026-11-21T20:05:00Z',
        gate: 'D6',
        pier: 'D',
        terminal: 2,
        flightStates: ['GTD'],
        codeshares: ['AM6204', 'VS6946'],
        checkinRows: ['9'],
        checkinAllocations: [
          {
            startTime: '2026-11-21T17:05:00Z',
            endTime: '2026-11-21T19:25:00Z',
            rows: [{ position: '9', desks: [{ position: 1 }, { position: 2 }] }],
          },
        ],
      },
    ]);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('VS6946');
    expect(text).toContain('KL1051');
    expect(text).toContain('PHNXD');
    expect(text).toContain('AM6204');
    expect(text).toContain('1, 2');
  });
});
