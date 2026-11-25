import { Component, computed, input, output } from '@angular/core';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { ScheduledFlight, TurnaroundPair } from '../../models/schedule.model';
import { FlightCard } from '../flight-card/flight-card';

@Component({
  selector: 'app-turnaround-card',
  imports: [FlightCard, MatIcon, MatChipSet, MatChip],
  templateUrl: './turnaround-card.html',
  styleUrl: './turnaround-card.css',
})
export class TurnaroundCard {
  readonly pair = input.required<TurnaroundPair>();
  readonly selectFlight = output<ScheduledFlight>();

  readonly isTightTurnaround = computed(() => {
    const mins = this.pair().groundMinutes;
    return mins != null && mins < 45;
  });
}
