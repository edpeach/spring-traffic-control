import { Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatCheckbox } from '@angular/material/checkbox';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { FlightDirection, ScheduleSyncRequest } from '../../models/schedule.model';

@Component({
  selector: 'app-schedule-sync-dialog',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatFormField,
    MatLabel,
    MatInput,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatCheckbox,
    MatButton,
    MatIcon,
  ],
  templateUrl: './schedule-sync-dialog.html',
  styleUrl: './schedule-sync-dialog.css',
})
export class ScheduleSyncDialog {
  private readonly dialogRef = inject(MatDialogRef<ScheduleSyncDialog, ScheduleSyncRequest>);

  readonly scheduleDate = signal(new Date().toISOString().slice(0, 10));
  readonly direction = signal<'ALL' | FlightDirection>('ALL');
  readonly includeDelays = signal(false);

  onDateInput(event: Event): void {
    this.scheduleDate.set((event.target as HTMLInputElement).value);
  }

  submit(): void {
    const dir = this.direction();
    const request: ScheduleSyncRequest = {
      scheduleDate: this.scheduleDate().trim() || null,
      direction: dir === 'ALL' ? null : dir,
      includeDelays: this.includeDelays(),
      maxPages: 500,
    };
    this.dialogRef.close(request);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
