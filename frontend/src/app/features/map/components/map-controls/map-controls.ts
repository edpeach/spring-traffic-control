import { Component, computed, inject } from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuTrigger } from '@angular/material/menu';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';
import { StationCodeDisplay, StationStore } from '../../../stations/store/station.store';
import { MapLayerId, MapProjection } from '../../config/map.config';
import { MapStore } from '../../store/map.store';

@Component({
  selector: 'app-map-controls',
  imports: [
    MatButtonToggleGroup,
    MatButtonToggle,
    MatButton,
    MatIconButton,
    MatIcon,
    MatMenu,
    MatMenuTrigger,
    MatSlideToggle,
    MatTooltip,
  ],
  templateUrl: './map-controls.html',
  styleUrl: './map-controls.css',
})
export class MapControls {
  readonly mapStore = inject(MapStore);
  readonly stationStore = inject(StationStore);

  // Display top-most rendered layer first in the layer stack menu
  readonly stackedLayers = computed(() => [...this.mapStore.layers()].reverse());

  setProjection(projection: MapProjection): void {
    this.mapStore.setProjection(projection);
  }

  setCodeDisplay(mode: StationCodeDisplay): void {
    this.stationStore.setCodeDisplay(mode);
  }

  toggleLayer(layerId: MapLayerId, visible: boolean): void {
    this.mapStore.toggleLayer(layerId, visible);
  }

  moveLayer(layerId: MapLayerId, direction: 'up' | 'down', event: Event): void {
    event.stopPropagation();
    this.mapStore.moveLayer(layerId, direction);
  }
}
