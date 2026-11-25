import { inject, Service } from '@angular/core';
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl';
import { MapStore } from '../../store/map.store';
import { MapLayerAdapter } from '../map-layer';
import { FLIGHT_TRACK_LAYER_CONFIG } from './flight-track.config';
import { FlightTrackLayerStore } from './flight-track.store';

@Service()
export class FlightTrackLayer implements MapLayerAdapter {
  private readonly layerStore = inject(FlightTrackLayerStore);
  private readonly mapStore = inject(MapStore);

  readonly id = FLIGHT_TRACK_LAYER_CONFIG.id;
  readonly mapLayerIds = [
    FLIGHT_TRACK_LAYER_CONFIG.closestAirportsLayerId,
    FLIGHT_TRACK_LAYER_CONFIG.closestAirportsLabelLayerId,
    FLIGHT_TRACK_LAYER_CONFIG.remainingLayerId,
    FLIGHT_TRACK_LAYER_CONFIG.flownLayerId,
  ] as const;

  attach(map: MapLibreMap): void {
    const visible = this.mapStore.layerVisibility()[this.id] ?? true;
    const visibility = visible ? 'visible' : 'none';

    if (!map.getSource(FLIGHT_TRACK_LAYER_CONFIG.closestAirportsSourceId)) {
      map.addSource(FLIGHT_TRACK_LAYER_CONFIG.closestAirportsSourceId, {
        type: 'geojson',
        data: this.layerStore.closestAirportsGeoJson(),
      });
    }

    if (!map.getSource(FLIGHT_TRACK_LAYER_CONFIG.remainingSourceId)) {
      map.addSource(FLIGHT_TRACK_LAYER_CONFIG.remainingSourceId, {
        type: 'geojson',
        data: this.layerStore.remainingGeoJson(),
      });
    }

    if (!map.getSource(FLIGHT_TRACK_LAYER_CONFIG.flownSourceId)) {
      map.addSource(FLIGHT_TRACK_LAYER_CONFIG.flownSourceId, {
        type: 'geojson',
        data: this.layerStore.flownGeoJson(),
      });
    }

    if (!map.getLayer(FLIGHT_TRACK_LAYER_CONFIG.closestAirportsLayerId)) {
      map.addLayer({
        id: FLIGHT_TRACK_LAYER_CONFIG.closestAirportsLayerId,
        type: 'line',
        source: FLIGHT_TRACK_LAYER_CONFIG.closestAirportsSourceId,
        layout: {
          visibility,
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': [
            'case',
            ['boolean', ['get', 'focused'], false],
            FLIGHT_TRACK_LAYER_CONFIG.closestAirportFocusedColor,
            FLIGHT_TRACK_LAYER_CONFIG.closestAirportColor,
          ],
          'line-width': [
            'case',
            ['boolean', ['get', 'focused'], false],
            FLIGHT_TRACK_LAYER_CONFIG.closestAirportFocusedWidth,
            FLIGHT_TRACK_LAYER_CONFIG.closestAirportWidth,
          ],
          'line-opacity': FLIGHT_TRACK_LAYER_CONFIG.closestAirportOpacity,
          'line-dasharray': [3, 2],
        },
      });
    }

    if (!map.getLayer(FLIGHT_TRACK_LAYER_CONFIG.closestAirportsLabelLayerId)) {
      map.addLayer({
        id: FLIGHT_TRACK_LAYER_CONFIG.closestAirportsLabelLayerId,
        type: 'symbol',
        source: FLIGHT_TRACK_LAYER_CONFIG.closestAirportsSourceId,
        layout: {
          visibility,
          'symbol-placement': 'line-center',
          'text-field': ['get', 'distanceLabel'],
          'text-size': 11,
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': [
            'case',
            ['boolean', ['get', 'focused'], false],
            FLIGHT_TRACK_LAYER_CONFIG.closestAirportFocusedColor,
            '#eef4f0',
          ],
          'text-halo-color': '#0b1411',
          'text-halo-width': 1.5,
        },
      });
    }

    if (!map.getLayer(FLIGHT_TRACK_LAYER_CONFIG.remainingLayerId)) {
      map.addLayer({
        id: FLIGHT_TRACK_LAYER_CONFIG.remainingLayerId,
        type: 'line',
        source: FLIGHT_TRACK_LAYER_CONFIG.remainingSourceId,
        layout: {
          visibility,
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': FLIGHT_TRACK_LAYER_CONFIG.remainingColor,
          'line-width': FLIGHT_TRACK_LAYER_CONFIG.remainingWidth,
          'line-opacity': FLIGHT_TRACK_LAYER_CONFIG.remainingOpacity,
          'line-dasharray': [2, 2],
        },
      });
    }

    if (!map.getLayer(FLIGHT_TRACK_LAYER_CONFIG.flownLayerId)) {
      map.addLayer({
        id: FLIGHT_TRACK_LAYER_CONFIG.flownLayerId,
        type: 'line',
        source: FLIGHT_TRACK_LAYER_CONFIG.flownSourceId,
        layout: {
          visibility,
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': FLIGHT_TRACK_LAYER_CONFIG.flownColor,
          'line-width': FLIGHT_TRACK_LAYER_CONFIG.flownWidth,
          'line-opacity': FLIGHT_TRACK_LAYER_CONFIG.flownOpacity,
        },
      });
    }
  }

  sync(map: MapLibreMap): void {
    const closestSource = map.getSource(FLIGHT_TRACK_LAYER_CONFIG.closestAirportsSourceId) as
      GeoJSONSource | undefined;
    closestSource?.setData(this.layerStore.closestAirportsGeoJson());

    const remainingSource = map.getSource(FLIGHT_TRACK_LAYER_CONFIG.remainingSourceId) as
      GeoJSONSource | undefined;
    remainingSource?.setData(this.layerStore.remainingGeoJson());

    const flownSource = map.getSource(FLIGHT_TRACK_LAYER_CONFIG.flownSourceId) as
      GeoJSONSource | undefined;
    flownSource?.setData(this.layerStore.flownGeoJson());
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
    for (const layerId of this.mapLayerIds) {
      if (map.getLayer(layerId)) {
        map.removeLayer(layerId);
      }
    }
    if (map.getSource(FLIGHT_TRACK_LAYER_CONFIG.closestAirportsSourceId)) {
      map.removeSource(FLIGHT_TRACK_LAYER_CONFIG.closestAirportsSourceId);
    }
    if (map.getSource(FLIGHT_TRACK_LAYER_CONFIG.flownSourceId)) {
      map.removeSource(FLIGHT_TRACK_LAYER_CONFIG.flownSourceId);
    }
    if (map.getSource(FLIGHT_TRACK_LAYER_CONFIG.remainingSourceId)) {
      map.removeSource(FLIGHT_TRACK_LAYER_CONFIG.remainingSourceId);
    }
  }
}
