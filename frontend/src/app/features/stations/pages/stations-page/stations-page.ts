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
import { MatTooltip } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { StationCard } from '../../components/station-card/station-card';
import { StationSyncDialog } from '../../components/station-sync-dialog/station-sync-dialog';
import {
  formatAirportType,
  formatCoordinates,
  formatElevation,
  Station,
  stationRouteCode,
  StationSyncRequest,
} from '../../models/station.model';
import { Stations } from '../../services/stations';
import { StationCodeDisplay, StationStore, StationsViewMode } from '../../store/station.store';

@Component({
  selector: 'app-stations-page',
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
    MatTooltip,
    StationCard,
  ],
  templateUrl: './stations-page.html',
  styleUrl: './stations-page.css',
})
export class StationsPage implements OnInit {
  readonly store = inject(StationStore);
  private readonly stationsService = inject(Stations);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);

  private readonly gridHost = viewChild<ElementRef<HTMLElement>>('gridHost');
  readonly columns = signal(3);

  readonly cardRows = computed(() => {
    const items = this.store.filteredStations();
    const cols = this.columns();
    const rows: Station[][] = [];
    for (let i = 0; i < items.length; i += cols) {
      rows.push(items.slice(i, i + cols));
    }
    return rows;
  });

  readonly formatAirportType = formatAirportType;
  readonly formatCoordinates = formatCoordinates;
  readonly formatElevation = formatElevation;

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
      this.stationsService.loadAll();
    }
  }

  setViewMode(mode: StationsViewMode): void {
    this.store.setViewMode(mode);
  }

  setCodeDisplay(mode: StationCodeDisplay): void {
    this.store.setCodeDisplay(mode);
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.store.setQuery(value);
  }

  openDetail(station: Station): void {
    void this.router.navigate(['/stations', stationRouteCode(station)]);
  }

  showOnMap(station: Station): void {
    const code = stationRouteCode(station);
    this.store.highlightStationOnMap(code);
    void this.router.navigate(['/map'], { queryParams: { station: code } });
  }

  openSyncDialog(): void {
    const ref = this.dialog.open<StationSyncDialog, void, StationSyncRequest>(StationSyncDialog, {
      width: '34rem',
      maxWidth: '95vw',
    });

    ref.afterClosed().subscribe((request) => {
      if (request) {
        this.stationsService.syncFromOpenAip(request);
      }
    });
  }

  dismissSyncMessage(): void {
    this.store.setSyncMessage(null);
  }

  trackById(_index: number, station: Station): string {
    return station.id;
  }

  trackRow(_index: number, row: Station[]): string {
    return row[0]?.id ?? String(_index);
  }
}
