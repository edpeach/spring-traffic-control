import { Component, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import {
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import {
  OPENAIP_AIRPORT_TYPES,
  OPENAIP_TRAFFIC_TYPES,
  StationSyncRequest,
} from '../../models/station.model';

@Component({
  selector: 'app-station-sync-dialog',
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatFormField,
    MatLabel,
    MatInput,
    MatChipListbox,
    MatChipOption,
    MatCheckbox,
    MatButton,
    MatIcon,
  ],
  templateUrl: './station-sync-dialog.html',
  styleUrl: './station-sync-dialog.css',
})
export class StationSyncDialog {
  private readonly dialogRef = inject(MatDialogRef<StationSyncDialog, StationSyncRequest>);

  readonly airportTypes = OPENAIP_AIRPORT_TYPES;
  readonly trafficTypes = OPENAIP_TRAFFIC_TYPES;

  readonly country = signal('NL');
  readonly search = signal('');
  readonly selectedTypes = signal<number[]>([]);
  readonly selectedTrafficTypes = signal<number[]>([]);
  readonly ppr = signal(false);
  readonly isPrivate = signal(false);
  readonly skydiveActivity = signal(false);
  readonly winchOnly = signal(false);
  readonly limit = signal(100);
  readonly maxPages = signal(5);

  toggleAirportType(code: number): void {
    this.selectedTypes.update((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
    );
  }

  toggleTrafficType(code: number): void {
    this.selectedTrafficTypes.update((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code],
    );
  }

  onCountryInput(event: Event): void {
    this.country.set((event.target as HTMLInputElement).value.toUpperCase());
  }

  onSearchInput(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  onLimitInput(event: Event): void {
    const parsed = Number((event.target as HTMLInputElement).value);
    if (!Number.isNaN(parsed)) this.limit.set(parsed);
  }

  onMaxPagesInput(event: Event): void {
    const parsed = Number((event.target as HTMLInputElement).value);
    if (!Number.isNaN(parsed)) this.maxPages.set(parsed);
  }

  submit(): void {
    const request: StationSyncRequest = {
      country: this.country().trim() || null,
      search: this.search().trim() || null,
      type: this.selectedTypes(),
      trafficType: this.selectedTrafficTypes(),
      ppr: this.ppr() ? true : null,
      isPrivate: this.isPrivate() ? true : null,
      skydiveActivity: this.skydiveActivity() ? true : null,
      winchOnly: this.winchOnly() ? true : null,
      limit: Math.min(1000, Math.max(1, this.limit())),
      maxPages: Math.min(50, Math.max(1, this.maxPages())),
    };
    this.dialogRef.close(request);
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
