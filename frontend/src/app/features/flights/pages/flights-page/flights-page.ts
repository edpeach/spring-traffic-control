import { ScrollingModule } from '@angular/cdk/scrolling';
import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatCard } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { FlightCard } from '../../components/flight-card/flight-card';
import { ScheduleSyncDialog } from '../../components/schedule-sync-dialog/schedule-sync-dialog';
import { TurnaroundCard } from '../../components/turnaround-card/turnaround-card';
import {
  formatAircraftType,
  formatRoute,
  formatTime,
  primaryEventIso,
  ScheduledFlight,
  ScheduleSyncRequest,
  TurnaroundPair,
  TurnaroundSortBy,
} from '../../models/schedule.model';
import { Schedule } from '../../services/schedule';
import { DirectionFilter, FlightsViewMode, ScheduleStore } from '../../store/schedule.store';

@Component({
  selector: 'app-flights-page',
  imports: [
    ScrollingModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatPrefix,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatButton,
    MatIconButton,
    MatIcon,
    MatCard,
    MatProgressSpinner,
    MatSlideToggle,
    MatTooltip,
    FlightCard,
    TurnaroundCard,
  ],
  templateUrl: './flights-page.html',
  styleUrl: './flights-page.css',
})
export class FlightsPage implements OnInit {
  readonly store = inject(ScheduleStore);
  private readonly scheduleService = inject(Schedule);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  private readonly gridHost = viewChild<ElementRef<HTMLElement>>('gridHost');
  readonly columns = signal(3);

  readonly cardRows = computed(() => {
    const items = this.store.filteredFlights();
    const cols = this.columns();
    const rows: ScheduledFlight[][] = [];
    for (let i = 0; i < items.length; i += cols) {
      rows.push(items.slice(i, i + cols));
    }
    return rows;
  });

  readonly formatRoute = formatRoute;
  readonly formatTime = formatTime;
  readonly formatAircraftType = formatAircraftType;
  readonly primaryEventIso = primaryEventIso;

  constructor() {
    afterRenderEffect((onCleanup) => {
      const host = this.gridHost()?.nativeElement;
      if (!host || typeof ResizeObserver === 'undefined') return;

      const updateColumns = (width: number) => {
        if (width >= 1024) {
          this.columns.set(3);
        } else if (width >= 640) {
          this.columns.set(2);
        } else {
          this.columns.set(1);
        }
      };

      updateColumns(host.clientWidth);
      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width;
        if (width != null) updateColumns(width);
      });
      observer.observe(host);
      onCleanup(() => observer.disconnect());
    });
  }

  ngOnInit(): void {
    if (this.store.totalCount() === 0 && !this.store.loading()) {
      this.scheduleService.loadAll();
    }
  }

  setViewMode(mode: FlightsViewMode): void {
    this.store.setViewMode(mode);
  }

  setDirectionFilter(dir: DirectionFilter): void {
    this.store.setDirectionFilter(dir);
  }

  setTurnaroundSortBy(sortBy: TurnaroundSortBy): void {
    this.store.setTurnaroundSortBy(sortBy);
  }

  setShowDepartedTurnarounds(show: boolean): void {
    this.store.setShowDepartedTurnarounds(show);
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.store.setQuery(value);
  }

  openDetail(flight: ScheduledFlight): void {
    void this.router.navigate(['/flights', flight.flightName]);
  }

  openSyncDialog(): void {
    const ref = this.dialog.open<ScheduleSyncDialog, void, ScheduleSyncRequest>(
      ScheduleSyncDialog,
      {
        width: '28rem',
        maxWidth: '95vw',
      },
    );

    ref.afterClosed().subscribe((request) => {
      if (request) {
        this.scheduleService.syncDay(request);
      }
    });
  }

  dismissSyncMessage(): void {
    this.store.setSyncMessage(null);
  }

  trackById(_index: number, flight: ScheduledFlight): string {
    return flight.id;
  }

  trackRow(_index: number, row: ScheduledFlight[]): string {
    return row[0]?.id ?? String(_index);
  }

  trackPair(_index: number, pair: TurnaroundPair): string {
    return pair.key;
  }
}
