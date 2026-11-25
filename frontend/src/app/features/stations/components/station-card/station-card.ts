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
  formatAirportType,
  formatCoordinates,
  formatElevation,
  Station,
} from '../../models/station.model';
import { StationCodeDisplay } from '../../store/station.store';

@Component({
  selector: 'app-station-card',
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
  templateUrl: './station-card.html',
  styleUrl: './station-card.css',
})
export class StationCard {
  readonly station = input.required<Station>();
  readonly codeDisplay = input<StationCodeDisplay>('icao');
  readonly viewDetails = output<Station>();
  readonly showOnMap = output<Station>();

  readonly expanded = signal(false);

  readonly airportTypeLabel = computed(() => formatAirportType(this.station().airportType));
  readonly coordinatesLabel = computed(() =>
    formatCoordinates(this.station().latitude, this.station().longitude),
  );
  readonly elevationLabel = computed(() => formatElevation(this.station().elevationMeters));
  readonly hasFlags = computed(() => {
    const s = this.station();
    return s.ppr || s.skydiveActivity || s.winchOnly;
  });

  toggleExpanded(): void {
    this.expanded.update((open) => !open);
  }
}
