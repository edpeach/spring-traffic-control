import { inject, Service } from '@angular/core';
import type { GeoJSONSource, Map as MapLibreMap, MapLayerMouseEvent } from 'maplibre-gl';
import { MapStore } from '../../store/map.store';
import { MapLayerAdapter } from '../map-layer';
import { AIRPORT_SVG, STATIONS_LAYER_CONFIG } from './stations.config';
import { StationsLayerStore } from './stations.store';

@Service()
export class StationsLayer implements MapLayerAdapter {
  private readonly layerStore = inject(StationsLayerStore);
  private readonly mapStore = inject(MapStore);

  readonly id = STATIONS_LAYER_CONFIG.id;
  readonly mapLayerIds = [
    STATIONS_LAYER_CONFIG.iconLayerId,
    STATIONS_LAYER_CONFIG.labelLayerId,
  ] as const;

  private boundMap: MapLibreMap | null = null;
  private iconImagePromise: Promise<HTMLImageElement> | null = null;

  private readonly handleClick = (event: MapLayerMouseEvent): void => {
    const feature = event.features?.[0];
    const code = feature?.properties?.['code'];
    if (typeof code === 'string' && code.length > 0) {
      const upper = code.toUpperCase();
      const isClosestAirport = this.mapStore
        .closestAirports()
        .some(
          (entry) =>
            entry.station.icao?.toUpperCase() === upper ||
            entry.station.iata?.toUpperCase() === upper ||
            entry.station.id.toUpperCase() === upper,
        );
      if (isClosestAirport && this.mapStore.selectedItem()?.kind === 'flight-state') {
        this.mapStore.focusClosestAirport(code);
        return;
      }
      this.layerStore.selectStation(code);
      this.mapStore.selectStation(code);
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

    if (!map.getSource(STATIONS_LAYER_CONFIG.sourceId)) {
      map.addSource(STATIONS_LAYER_CONFIG.sourceId, {
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
    const source = map.getSource(STATIONS_LAYER_CONFIG.sourceId) as GeoJSONSource | undefined;
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
    map.off('click', STATIONS_LAYER_CONFIG.iconLayerId, this.handleClick);
    map.off('mouseenter', STATIONS_LAYER_CONFIG.iconLayerId, this.handleMouseEnter);
    map.off('mouseleave', STATIONS_LAYER_CONFIG.iconLayerId, this.handleMouseLeave);

    for (const layerId of this.mapLayerIds) {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    }
    if (map.getSource(STATIONS_LAYER_CONFIG.sourceId)) {
      map.removeSource(STATIONS_LAYER_CONFIG.sourceId);
    }
    this.boundMap = null;
  }

  private addLayers(map: MapLibreMap): void {
    const visible = this.mapStore.layerVisibility()[this.id] ?? true;
    const visibility = visible ? 'visible' : 'none';

    if (!map.getLayer(STATIONS_LAYER_CONFIG.iconLayerId)) {
      map.addLayer({
        id: STATIONS_LAYER_CONFIG.iconLayerId,
        type: 'symbol',
        source: STATIONS_LAYER_CONFIG.sourceId,
        layout: {
          visibility,
          'icon-image': STATIONS_LAYER_CONFIG.iconImageId,
          'icon-size': [
            'interpolate',
            ['linear'],
            ['zoom'],
            2,
            [
              'case',
              ['boolean', ['get', 'highlighted'], false],
              STATIONS_LAYER_CONFIG.iconSizeStops.z2.highlight,
              STATIONS_LAYER_CONFIG.iconSizeStops.z2.normal,
            ],
            6,
            [
              'case',
              ['boolean', ['get', 'highlighted'], false],
              STATIONS_LAYER_CONFIG.iconSizeStops.z6.highlight,
              STATIONS_LAYER_CONFIG.iconSizeStops.z6.normal,
            ],
            10,
            [
              'case',
              ['boolean', ['get', 'highlighted'], false],
              STATIONS_LAYER_CONFIG.iconSizeStops.z10.highlight,
              STATIONS_LAYER_CONFIG.iconSizeStops.z10.normal,
            ],
            14,
            [
              'case',
              ['boolean', ['get', 'highlighted'], false],
              STATIONS_LAYER_CONFIG.iconSizeStops.z14.highlight,
              STATIONS_LAYER_CONFIG.iconSizeStops.z14.normal,
            ],
          ],
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'symbol-sort-key': ['case', ['boolean', ['get', 'highlighted'], false], 10, 1],
        },
        paint: {
          'icon-color': [
            'case',
            ['boolean', ['get', 'highlighted'], false],
            STATIONS_LAYER_CONFIG.highlightColor,
            STATIONS_LAYER_CONFIG.defaultColor,
          ],
          'icon-opacity': [
            'case',
            ['boolean', ['get', 'highlighted'], false],
            1,
            ['boolean', ['get', 'dimmed'], false],
            STATIONS_LAYER_CONFIG.dimmedOpacity,
            STATIONS_LAYER_CONFIG.defaultOpacity,
          ],
          'icon-halo-color': STATIONS_LAYER_CONFIG.strokeColor,
          'icon-halo-width': 1,
        },
      });
    }

    if (!map.getLayer(STATIONS_LAYER_CONFIG.labelLayerId)) {
      map.addLayer({
        id: STATIONS_LAYER_CONFIG.labelLayerId,
        type: 'symbol',
        source: STATIONS_LAYER_CONFIG.sourceId,
        minzoom: STATIONS_LAYER_CONFIG.labelMinZoom,
        layout: {
          visibility,
          'text-field': ['get', 'label'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 7, 10, 12, 13],
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-optional': true,
        },
        paint: {
          'text-color': [
            'case',
            ['boolean', ['get', 'highlighted'], false],
            STATIONS_LAYER_CONFIG.highlightColor,
            '#eef4f0',
          ],
          'text-opacity': [
            'case',
            ['boolean', ['get', 'highlighted'], false],
            1,
            ['boolean', ['get', 'dimmed'], false],
            STATIONS_LAYER_CONFIG.dimmedOpacity,
            1,
          ],
          'text-halo-color': STATIONS_LAYER_CONFIG.strokeColor,
          'text-halo-width': 1.2,
        },
      });
    }

    map.off('click', STATIONS_LAYER_CONFIG.iconLayerId, this.handleClick);
    map.off('mouseenter', STATIONS_LAYER_CONFIG.iconLayerId, this.handleMouseEnter);
    map.off('mouseleave', STATIONS_LAYER_CONFIG.iconLayerId, this.handleMouseLeave);

    map.on('click', STATIONS_LAYER_CONFIG.iconLayerId, this.handleClick);
    map.on('mouseenter', STATIONS_LAYER_CONFIG.iconLayerId, this.handleMouseEnter);
    map.on('mouseleave', STATIONS_LAYER_CONFIG.iconLayerId, this.handleMouseLeave);
  }

  private async ensureIconImage(map: MapLibreMap): Promise<void> {
    if (map.hasImage(STATIONS_LAYER_CONFIG.iconImageId)) return;

    this.iconImagePromise ??= new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image(32, 32);
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(AIRPORT_SVG)}`;
    });

    const image = await this.iconImagePromise;
    if (this.boundMap === map && !map.hasImage(STATIONS_LAYER_CONFIG.iconImageId)) {
      map.addImage(STATIONS_LAYER_CONFIG.iconImageId, image, { sdf: true });
    }
  }
}
