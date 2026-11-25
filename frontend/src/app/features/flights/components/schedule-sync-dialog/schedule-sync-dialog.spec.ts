import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { vi } from 'vitest';
import { ScheduleSyncDialog } from './schedule-sync-dialog';

describe('ScheduleSyncDialog', () => {
  let component: ScheduleSyncDialog;
  let fixture: ComponentFixture<ScheduleSyncDialog>;
  const closeSpy = vi.fn();

  beforeEach(async () => {
    closeSpy.mockReset();
    await TestBed.configureTestingModule({
      imports: [ScheduleSyncDialog],
      providers: [{ provide: MatDialogRef, useValue: { close: closeSpy } }],
    }).compileComponents();

    fixture = TestBed.createComponent(ScheduleSyncDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('submits full-day schedule sync request', () => {
    component.scheduleDate.set('2026-11-21');
    component.direction.set('D');
    component.includeDelays.set(true);
    component.submit();

    expect(closeSpy).toHaveBeenCalledWith({
      scheduleDate: '2026-11-21',
      direction: 'D',
      includeDelays: true,
      maxPages: 500,
    });
  });
});
