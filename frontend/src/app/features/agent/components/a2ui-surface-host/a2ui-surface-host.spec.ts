import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AguiControlService } from '../../../../core/services/agui-control.service';
import { A2UiSurfaceHost } from './a2ui-surface-host';

describe('A2UiSurfaceHost', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [A2UiSurfaceHost],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
  });

  it('wires StationCard showOnMap and viewDetails outputs to AguiControlService', async () => {
    const control = TestBed.inject(AguiControlService);
    const enqueueSpy = vi.spyOn(control, 'enqueueAction');

    const fixture = TestBed.createComponent(A2UiSurfaceHost);
    fixture.componentRef.setInput('surface', {
      surfaceId: 'a2ui-1',
      component: 'StationCard',
      data: {
        station: {
          id: 'eham',
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
        },
      },
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const buttons = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    ) as HTMLButtonElement[];
    const showOnMapBtn = buttons.find((b) => b.textContent?.includes('Show on map'));
    const detailsBtn = buttons.find((b) => b.textContent?.includes('Details'));

    expect(showOnMapBtn).toBeTruthy();
    expect(detailsBtn).toBeTruthy();

    showOnMapBtn!.click();
    expect(enqueueSpy).toHaveBeenCalledWith({
      action: 'selectStationOnMap',
      params: { code: 'EHAM' },
    });

    detailsBtn!.click();
    expect(enqueueSpy).toHaveBeenCalledWith({
      action: 'navigate',
      params: { route: '/stations/EHAM' },
    });
  });
});
