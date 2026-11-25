import { Component, computed, input, output, signal } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MatCard,
  MatCardActions,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { MatDivider } from '@angular/material/divider';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import {
  formatAircraftType,
  formatRoute,
  formatTime,
  primaryEventIso,
  ScheduledFlight,
} from '../../models/schedule.model';

@Component({
  selector: 'app-flight-card',
  imports: [
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatCardActions,
    MatButton,
    MatIconButton,
    MatIcon,
    MatDivider,
    MatChipSet,
    MatChip,
    MatTooltip,
  ],
  templateUrl: './flight-card.html',
  styleUrl: './flight-card.css',
})
export class FlightCard {
  readonly flight = input.required<ScheduledFlight>();
  readonly viewDetails = output<ScheduledFlight>();

  readonly expanded = signal(false);

  readonly isArrival = computed(() => this.flight().flightDirection === 'A');
  readonly routeLabel = computed(() => formatRoute(this.flight()));
  readonly scheduledTimeLabel = computed(() =>
    formatTime(this.flight().scheduleDateTime, this.flight().scheduleTime),
  );
  readonly liveTimeLabel = computed(() => formatTime(primaryEventIso(this.flight())));
  readonly aircraftTypeLabel = computed(() => formatAircraftType(this.flight()));
  readonly isCodeshare = computed(() => {
    const f = this.flight();
    return !!f.mainFlight && f.mainFlight !== f.flightName;
  });

  toggleExpanded(): void {
    this.expanded.update((open) => !open);
  }
}
