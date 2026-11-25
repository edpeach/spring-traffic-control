import { inject, Service } from '@angular/core';
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import { MapStore } from '../../store/map.store';
import { MapLayerAdapter } from '../map-layer';
import { AIRPLANE_SVG, FLIGHT_STATES_LAYER_CONFIG } from './flight-states.config';
import { FlightStatesLayerStore } from './flight-states.store';

@Service()
export class FlightStatesLayer implements MapLayerAdapter {
  private readonly layerStore = inject(FlightStatesLayerStore);
  private readonly mapStore = inject(MapStore);

  readonly id = FLIGHT_STATES_LAYER_CONFIG.id;
  readonly mapLayerIds = [
    FLIGHT_STATES_LAYER_CONFIG.iconLayerId,
    FLIGHT_STATES_LAYER_CONFIG.labelLayerId,
  ] as const;

  private boundMap: MapLibreMap | null = null;
  private iconImagePromise: Promise<HTMLImageElement> | null = null;

  private readonly handleClick = (event: MapLayerMouseEvent): void => {
    const feature = event.features?.[0];
    const icao24 = feature?.properties?.['icao24'];
    if (typeof icao24 === 'string' && icao24.length > 0) {
      this.layerStore.selectFlightState(icao24);
      this.mapStore.selectFlightState(icao24);
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

    if (!map.getSource(FLIGHT_STATES_LAYER_CONFIG.sourceId)) {
      map.addSource(FLIGHT_STATES_LAYER_CONFIG.sourceId, {
        type: 'geojson',
        data: this.layerStore.geoJson(),
      });
    }

    void this.ensureIconImage(map).then(() => {
      if (this.boundMap !== map) return;
      this.addLayers(map);
    });
  }

  sync(map: MapLibreMap): void {
    const source = map.getSource(FLIGHT_STATES_LAYER_CONFIG.sourceId) as GeoJSONSource | undefined;
    source?.setData(this.layerStore.geoJson());
  }

  setVisible(map: MapLibreMap, visible: boolean): void {
    const visibility = visible ? 'visible' : 'none';
    for (const layerId of this.mapLayerIds) {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visibility);
      }
    }
  }

  detach(map: MapLibreMap): void {
    map.off('click', FLIGHT_STATES_LAYER_CONFIG.iconLayerId, this.handleClick);
    map.off('mouseenter', FLIGHT_STATES_LAYER_CONFIG.iconLayerId, this.handleMouseEnter);
    map.off('mouseleave', FLIGHT_STATES_LAYER_CONFIG.iconLayerId, this.handleMouseLeave);

    for (const layerId of this.mapLayerIds) {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    }
    if (map.getSource(FLIGHT_STATES_LAYER_CONFIG.sourceId)) {
      map.removeSource(FLIGHT_STATES_LAYER_CONFIG.sourceId);
    }
    this.boundMap = null;
  }

  private addLayers(map: MapLibreMap): void {
    const visible = this.mapStore.layerVisibility()[this.id] ?? true;
    const visibility = visible ? 'visible' : 'none';

    if (!map.getLayer(FLIGHT_STATES_LAYER_CONFIG.iconLayerId)) {
      map.addLayer({
        id: FLIGHT_STATES_LAYER_CONFIG.iconLayerId,
        type: 'symbol',
        source: FLIGHT_STATES_LAYER_CONFIG.sourceId,
        layout: {
          visibility,
          'icon-image': FLIGHT_STATES_LAYER_CONFIG.iconImageId,
          'icon-rotate': ['coalesce', ['get', 'trueTrack'], 0],
          'icon-rotation-alignment': 'map',
          'icon-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            2,
            [
              'case',
              ['boolean', ['get', 'highlighted'], false],
              FLIGHT_STATES_LAYER_CONFIG.iconSizeStops.z2.highlight,
              FLIGHT_STATES_LAYER_CONFIG.iconSizeStops.z2.normal,
            ],
            6,
            [
              'case',
              ['boolean', ['get', 'highlighted'], false],
              FLIGHT_STATES_LAYER_CONFIG.iconSizeStops.z6.highlight,
              FLIGHT_STATES_LAYER_CONFIG.iconSizeStops.z6.normal,
            ],
            10,
            [
              'case',
              ['boolean', ['get', 'highlighted'], false],
              FLIGHT_STATES_LAYER_CONFIG.iconSizeStops.z10.highlight,
              FLIGHT_STATES_LAYER_CONFIG.iconSizeStops.z10.normal,
            ],
            14,
            [
              'case',
              ['boolean', ['get', 'highlighted'], false],
              FLIGHT_STATES_LAYER_CONFIG.iconSizeStops.z14.highlight,
              FLIGHT_STATES_LAYER_CONFIG.iconSizeStops.z14.normal,
            ],
          ],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
        paint: {
          'icon-color': [
            'case',
            ['boolean', ['get', 'highlighted'], false],
            FLIGHT_STATES_LAYER_CONFIG.highlightColor,
            ['==', ['get', 'direction'], 'A'],
            FLIGHT_STATES_LAYER_CONFIG.arrivalColor,
            ['==', ['get', 'direction'], 'D'],
            FLIGHT_STATES_LAYER_CONFIG.departureColor,
            FLIGHT_STATES_LAYER_CONFIG.defaultColor,
          ],
          'icon-opacity': [
            'case',
            ['boolean', ['get', 'highlighted'], false],
            1,
            ['boolean', ['get', 'dimmed'], false],
            FLIGHT_STATES_LAYER_CONFIG.dimmedOpacity,
            FLIGHT_STATES_LAYER_CONFIG.defaultOpacity,
          ],
          'icon-halo-color': FLIGHT_STATES_LAYER_CONFIG.strokeColor,
          'icon-halo-width': 1,
        },
      });
    }

    if (!map.getLayer(FLIGHT_STATES_LAYER_CONFIG.labelLayerId)) {
      map.addLayer({
        id: FLIGHT_STATES_LAYER_CONFIG.labelLayerId,
        type: 'symbol',
        source: FLIGHT_STATES_LAYER_CONFIG.sourceId,
        minzoom: FLIGHT_STATES_LAYER_CONFIG.labelMinZoom,
        layout: {
          visibility,
          'text-field': ['get', 'label'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 6, 10, 12, 12],
          'text-offset': [0, 1.3],
          'text-anchor': 'top',
          'text-optional': true,
        },
        paint: {
          'text-color': [
            'case',
            ['boolean', ['get', 'highlighted'], false],
            FLIGHT_STATES_LAYER_CONFIG.highlightColor,
            '#eef4f0',
          ],
          'text-opacity': [
            'case',
            ['boolean', ['get', 'highlighted'], false],
            1,
            ['boolean', ['get', 'dimmed'], false],
            FLIGHT_STATES_LAYER_CONFIG.dimmedOpacity,
            0.9,
          ],
          'text-halo-color': FLIGHT_STATES_LAYER_CONFIG.strokeColor,
          'text-halo-width': 1.2,
        },
      });
    }

    map.off('click', FLIGHT_STATES_LAYER_CONFIG.iconLayerId, this.handleClick);
    map.off('mouseenter', FLIGHT_STATES_LAYER_CONFIG.iconLayerId, this.handleMouseEnter);
    map.off('mouseleave', FLIGHT_STATES_LAYER_CONFIG.iconLayerId, this.handleMouseLeave);

    map.on('click', FLIGHT_STATES_LAYER_CONFIG.iconLayerId, this.handleClick);
    map.on('mouseenter', FLIGHT_STATES_LAYER_CONFIG.iconLayerId, this.handleMouseEnter);
    map.on('mouseleave', FLIGHT_STATES_LAYER_CONFIG.iconLayerId, this.handleMouseLeave);
  }

  private async ensureIconImage(map: MapLibreMap): Promise<void> {
    if (map.hasImage(FLIGHT_STATES_LAYER_CONFIG.iconImageId)) return;

    this.iconImagePromise ??= new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image(32, 32);
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(AIRPLANE_SVG)}`;
    });

    const image = await this.iconImagePromise;
    if (this.boundMap === map && !map.hasImage(FLIGHT_STATES_LAYER_CONFIG.iconImageId)) {
      map.addImage(FLIGHT_STATES_LAYER_CONFIG.iconImageId, image, { sdf: true });
    }
  }
}
