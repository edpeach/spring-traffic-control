import { inject, Service } from '@angular/core';
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import { MapStore } from '../../store/map.store';
import { MapLayerAdapter } from '../map-layer';
import { FLIGHT_PATHS_LAYER_CONFIG } from './flight-paths.config';
import { FlightPathsLayerStore } from './flight-paths.store';

@Service()
export class FlightPathsLayer implements MapLayerAdapter {
  private readonly layerStore = inject(FlightPathsLayerStore);
  private readonly mapStore = inject(MapStore);

  readonly id = FLIGHT_PATHS_LAYER_CONFIG.id;
  readonly mapLayerIds = [FLIGHT_PATHS_LAYER_CONFIG.lineLayerId] as const;

  private boundMap: MapLibreMap | null = null;

  private readonly handleClick = (event: MapLayerMouseEvent): void => {
    const feature = event.features?.[0];
    const flightName = feature?.properties?.['flightName'];
    if (typeof flightName === 'string' && flightName.length > 0) {
      this.layerStore.selectFlight(flightName);
      this.mapStore.selectFlight(flightName);
    }
  };

  private readonly handleMouseEnter = (): void => {
    if (this.boundMap) {
      this.boundMap.getCanvas().style.cursor = 'pointer';
    }
  };

  private readonly handleMouseLeave = (): void => {
    if (this.boundMap) {
      this.boundMap.getCanvas().style.cursor = '';
    }
  };

  attach(map: MapLibreMap): void {
    this.boundMap = map;

    if (!map.getSource(FLIGHT_PATHS_LAYER_CONFIG.sourceId)) {
      map.addSource(FLIGHT_PATHS_LAYER_CONFIG.sourceId, {
        type: 'geojson',
        data: this.layerStore.geoJson(),
      });
    }

    if (!map.getLayer(FLIGHT_PATHS_LAYER_CONFIG.lineLayerId)) {
      const visible = this.mapStore.layerVisibility()[this.id] ?? false;
      map.addLayer({
        id: FLIGHT_PATHS_LAYER_CONFIG.lineLayerId,
        type: 'line',
        source: FLIGHT_PATHS_LAYER_CONFIG.sourceId,
        layout: {
          visibility: visible ? 'visible' : 'none',
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'highlighted'], false],
            FLIGHT_PATHS_LAYER_CONFIG.highlightColor,
            ['==', ['get', 'direction'], 'A'],
            FLIGHT_PATHS_LAYER_CONFIG.arrivalColor,
            FLIGHT_PATHS_LAYER_CONFIG.departureColor,
          ],
          'line-width': [
            'case',
            ['boolean', ['get', 'highlighted'], false],
            FLIGHT_PATHS_LAYER_CONFIG.highlightWidth,
            FLIGHT_PATHS_LAYER_CONFIG.defaultWidth,
          ],
          'line-opacity': [
            'case',
            ['boolean', ['get', 'highlighted'], false],
            0.95,
            ['boolean', ['get', 'dimmed'], false],
            FLIGHT_PATHS_LAYER_CONFIG.dimmedOpacity,
            FLIGHT_PATHS_LAYER_CONFIG.defaultOpacity,
          ],
        },
      });
    }

    map.off('click', FLIGHT_PATHS_LAYER_CONFIG.lineLayerId, this.handleClick);
    map.off('mouseenter', FLIGHT_PATHS_LAYER_CONFIG.lineLayerId, this.handleMouseEnter);
    map.off('mouseleave', FLIGHT_PATHS_LAYER_CONFIG.lineLayerId, this.handleMouseLeave);

    map.on('click', FLIGHT_PATHS_LAYER_CONFIG.lineLayerId, this.handleClick);
    map.on('mouseenter', FLIGHT_PATHS_LAYER_CONFIG.lineLayerId, this.handleMouseEnter);
    map.on('mouseleave', FLIGHT_PATHS_LAYER_CONFIG.lineLayerId, this.handleMouseLeave);
  }

  sync(map: MapLibreMap): void {
    const source = map.getSource(FLIGHT_PATHS_LAYER_CONFIG.sourceId) as GeoJSONSource | undefined;
    source?.setData(this.layerStore.geoJson());
  }

  setVisible(map: MapLibreMap, visible: boolean): void {
    if (map.getLayer(FLIGHT_PATHS_LAYER_CONFIG.lineLayerId)) {
      map.setLayoutProperty(
        FLIGHT_PATHS_LAYER_CONFIG.lineLayerId,
        'visibility',
        visible ? 'visible' : 'none',
      );
    }
  }

  detach(map: MapLibreMap): void {
    map.off('click', FLIGHT_PATHS_LAYER_CONFIG.lineLayerId, this.handleClick);
    map.off('mouseenter', FLIGHT_PATHS_LAYER_CONFIG.lineLayerId, this.handleMouseEnter);
    map.off('mouseleave', FLIGHT_PATHS_LAYER_CONFIG.lineLayerId, this.handleMouseLeave);

    if (map.getLayer(FLIGHT_PATHS_LAYER_CONFIG.lineLayerId)) {
      map.removeLayer(FLIGHT_PATHS_LAYER_CONFIG.lineLayerId);
    }
    if (map.getSource(FLIGHT_PATHS_LAYER_CONFIG.sourceId)) {
      map.removeSource(FLIGHT_PATHS_LAYER_CONFIG.sourceId);
    }
    this.boundMap = null;
  }
}
