import { inject, Service } from '@angular/core';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { MapLayerAdapter } from '../map-layer';
import { DAY_NIGHT_LAYER_CONFIG } from './day-night.config';
import { DayNightLayerStore } from './day-night.store';

@Service()
export class DayNightLayer implements MapLayerAdapter {
  private readonly store = inject(DayNightLayerStore);

  readonly id = DAY_NIGHT_LAYER_CONFIG.id;
  readonly mapLayerIds = [DAY_NIGHT_LAYER_CONFIG.fillLayerId] as const;

  attach(map: MapLibreMap): void {
    if (!map.getSource(DAY_NIGHT_LAYER_CONFIG.sourceId)) {
      map.addSource(DAY_NIGHT_LAYER_CONFIG.sourceId, {
        type: 'geojson',
        data: this.store.nightGeoJson(),
      });
    }

    if (!map.getLayer(DAY_NIGHT_LAYER_CONFIG.fillLayerId)) {
      map.addLayer({
        id: DAY_NIGHT_LAYER_CONFIG.fillLayerId,
        type: 'fill',
        source: DAY_NIGHT_LAYER_CONFIG.sourceId,
        paint: {
          'fill-color': DAY_NIGHT_LAYER_CONFIG.fillColor,
          'fill-opacity': DAY_NIGHT_LAYER_CONFIG.fillOpacity,
        },
      });
    }
  }

  sync(map: MapLibreMap): void {
    const source = map.getSource(DAY_NIGHT_LAYER_CONFIG.sourceId) as GeoJSONSource | undefined;
    source?.setData(this.store.nightGeoJson());
  }

  setVisible(map: MapLibreMap, visible: boolean): void {
    if (map.getLayer(DAY_NIGHT_LAYER_CONFIG.fillLayerId)) {
      map.setLayoutProperty(
        DAY_NIGHT_LAYER_CONFIG.fillLayerId,
        'visibility',
        visible ? 'visible' : 'none',
      );
    }
  }

  detach(map: MapLibreMap): void {
    if (map.getLayer(DAY_NIGHT_LAYER_CONFIG.fillLayerId)) {
      map.removeLayer(DAY_NIGHT_LAYER_CONFIG.fillLayerId);
    }
    if (map.getSource(DAY_NIGHT_LAYER_CONFIG.sourceId)) {
      map.removeSource(DAY_NIGHT_LAYER_CONFIG.sourceId);
    }
  }
}
