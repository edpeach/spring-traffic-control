import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';
import { StationSyncDialog } from './station-sync-dialog';

describe('StationSyncDialog', () => {
  let component: StationSyncDialog;
  let fixture: ComponentFixture<StationSyncDialog>;
  const closeSpy = vi.fn();

  beforeEach(async () => {
    closeSpy.mockReset();
    await TestBed.configureTestingModule({
      imports: [StationSyncDialog],
      providers: [{ provide: MatDialogRef, useValue: { close: closeSpy } }],
    }).compileComponents();

    fixture = TestBed.createComponent(StationSyncDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('submits configured OpenAIP sync request', () => {
    component.country.set('DE');
    component.toggleAirportType(3);
    component.ppr.set(true);
    component.submit();

    expect(closeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        country: 'DE',
        type: [3],
        ppr: true,
        limit: 100,
        maxPages: 5,
      }),
    );
  });
});
