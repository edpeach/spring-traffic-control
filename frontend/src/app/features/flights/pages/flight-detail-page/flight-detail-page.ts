import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { formatAircraftType, formatDateTime, formatRoute } from '../../models/schedule.model';
import { Schedule } from '../../services/schedule';
import { ScheduleStore } from '../../store/schedule.store';

interface CheckinTableRow {
  row: string;
  desks: string;
  window: string;
}

@Component({
  selector: 'app-flight-detail-page',
  imports: [
    RouterLink,
    MatButton,
    MatIcon,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatChipSet,
    MatChip,
    MatProgressSpinner,
    MatTableModule,
  ],
  templateUrl: './flight-detail-page.html',
  styleUrl: './flight-detail-page.css',
})
export class FlightDetailPage {
  readonly store = inject(ScheduleStore);
  private readonly scheduleService = inject(Schedule);
  private readonly route = inject(ActivatedRoute);

  readonly flightName = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('flightName') ?? '')),
    { initialValue: '' },
  );

  readonly flight = computed(() => {
    const requested = this.flightName().trim().toUpperCase();
    const matches = this.store.selectedFlightMatches();
    return matches.find((f) => f.flightName.toUpperCase() === requested) ?? matches[0] ?? null;
  });

  readonly checkinTableRows = computed<CheckinTableRow[]>(() => {
    const f = this.flight();
    if (!f) return [];
    const rows: CheckinTableRow[] = [];
    for (const alloc of f.checkinAllocations) {
      const window = `${formatDateTime(alloc.startTime)} – ${formatDateTime(alloc.endTime)}`;
      for (const row of alloc.rows) {
        const desks = row.desks
          .map((d) => (d.classCode ? `${d.position} (${d.classCode})` : String(d.position ?? '—')))
          .join(', ');
        rows.push({
          row: row.position ?? '—',
          desks: desks || '—',
          window,
        });
      }
    }
    return rows;
  });

  readonly checkinColumns = ['row', 'desks', 'window'];

  readonly formatRoute = formatRoute;
  readonly formatAircraftType = formatAircraftType;
  readonly formatDateTime = formatDateTime;

  constructor() {
    effect(() => {
      const name = this.flightName();
      if (name) {
        this.scheduleService.loadByFlightName(name);
      }
    });
  }
}
