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
import { MatChip, MatChipAvatar, MatChipSet } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { formatAirportType, formatCoordinates, formatElevation } from '../../models/station.model';
import { Stations } from '../../services/stations';
import { StationStore } from '../../store/station.store';

@Component({
  selector: 'app-station-detail-page',
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
    MatChipAvatar,
    MatProgressSpinner,
    MatTableModule,
  ],
  templateUrl: './station-detail-page.html',
  styleUrl: './station-detail-page.css',
})
export class StationDetailPage {
  readonly store = inject(StationStore);
  private readonly stationsService = inject(Stations);
  private readonly route = inject(ActivatedRoute);

  readonly code = toSignal(this.route.paramMap.pipe(map((params) => params.get('code') ?? '')), {
    initialValue: '',
  });

  readonly station = computed(() => this.store.selectedStation());

  readonly runwayColumns = [
    'designator',
    'heading',
    'dimensions',
    'surface',
    'pcn',
    'distances',
    'flags',
  ];
  readonly frequencyColumns = ['value', 'type', 'name', 'status'];

  readonly formatAirportType = formatAirportType;
  readonly formatCoordinates = formatCoordinates;
  readonly formatElevation = formatElevation;

  constructor() {
    effect(() => {
      const code = this.code();
      if (code) {
        this.stationsService.loadDetail(code);
      }
    });
  }
}
