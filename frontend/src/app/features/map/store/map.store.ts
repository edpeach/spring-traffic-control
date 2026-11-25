import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { NearestStation } from '../../stations/models/station.model';
import {
  MAP_CONFIG,
  MapCameraBounds,
  MapCameraTarget,
  MapLayerConfig,
  MapLayerId,
  MapProjection,
} from '../config/map.config';
import { FLIGHT_TRACK_LAYER_CONFIG } from '../layers/flight-track/flight-track.config';

export type MapSelectedItem =
  | { kind: 'station'; code: string }
  | { kind: 'flight'; flightName: string }
  | { kind: 'flight-state'; icao24: string };

interface MapState {
  projection: MapProjection;
  layers: MapLayerConfig[];
  panelOpen: boolean;
  selectedItem: MapSelectedItem | null;
  cameraTarget: MapCameraTarget | null;
  cameraBounds: MapCameraBounds | null;
  closestAirports: NearestStation[];
  closestAirportsLoading: boolean;
  focusedClosestAirportCode: string | null;
}

const initialState: MapState = {
  projection: MAP_CONFIG.defaultProjection,
  layers: MAP_CONFIG.defaultLayers.map((layer) => ({ ...layer })),
  panelOpen: false,
  selectedItem: null,
  cameraTarget: null,
  cameraBounds: null,
  closestAirports: [],
  closestAirportsLoading: false,
  focusedClosestAirportCode: null,
};

export const MapStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ layers }) => ({
    layerVisibility: computed(
      () =>
        Object.fromEntries(layers().map((layer) => [layer.id, layer.visible])) as Record<
          MapLayerId,
          boolean
        >,
    ),
    layerOrder: computed(() => layers().map((layer) => layer.id)),
  })),
  withMethods((store) => ({
    setProjection(projection: MapProjection): void {
      patchState(store, { projection });
    },
    toggleLayer(layerId: MapLayerId, visible?: boolean): void {
      patchState(store, (state) => ({
        layers: state.layers.map((layer) =>
          layer.id === layerId ? { ...layer, visible: visible ?? !layer.visible } : layer,
        ),
      }));
    },
    moveLayer(layerId: MapLayerId, direction: 'up' | 'down'): void {
      patchState(store, (state) => {
        const current = [...state.layers];
        const index = current.findIndex((layer) => layer.id === layerId);
        if (index === -1) return {};

        // Higher index renders on top in MapLibre
        const targetIndex = direction === 'up' ? index + 1 : index - 1;
        if (targetIndex < 0 || targetIndex >= current.length) return {};

        const [moved] = current.splice(index, 1);
        current.splice(targetIndex, 0, moved);
        return { layers: current };
      });
    },
    selectStation(code: string): void {
      patchState(store, (state) => ({
        selectedItem: { kind: 'station' as const, code },
        panelOpen: true,
        layers: state.layers.filter((l) => l.id !== FLIGHT_TRACK_LAYER_CONFIG.id),
      }));
    },
    selectFlight(flightName: string): void {
      patchState(store, (state) => ({
        selectedItem: { kind: 'flight' as const, flightName },
        panelOpen: true,
        layers: state.layers.filter((l) => l.id !== FLIGHT_TRACK_LAYER_CONFIG.id),
      }));
    },
    selectFlightState(icao24: string): void {
      patchState(store, (state) => {
        const hasTrackLayer = state.layers.some((l) => l.id === FLIGHT_TRACK_LAYER_CONFIG.id);
        let layers = state.layers;
        if (!hasTrackLayer) {
          const trackLayer: MapLayerConfig = {
            id: FLIGHT_TRACK_LAYER_CONFIG.id,
            label: FLIGHT_TRACK_LAYER_CONFIG.label,
            icon: FLIGHT_TRACK_LAYER_CONFIG.icon,
            visible: true,
          };
          const flightStatesIdx = layers.findIndex((l) => l.id === 'flight-states');
          layers =
            flightStatesIdx >= 0
              ? [...layers.slice(0, flightStatesIdx), trackLayer, ...layers.slice(flightStatesIdx)]
              : [...layers, trackLayer];
        }
        return {
          selectedItem: { kind: 'flight-state' as const, icao24: icao24.trim().toLowerCase() },
          panelOpen: true,
          layers,
        };
      });
    },
    openPanel(): void {
      patchState(store, { panelOpen: true });
    },
    closePanel(): void {
      patchState(store, { panelOpen: false });
    },
    clearSelection(): void {
      patchState(store, (state) => ({
        selectedItem: null,
        panelOpen: false,
        closestAirports: [],
        closestAirportsLoading: false,
        focusedClosestAirportCode: null,
        layers: state.layers.filter((l) => l.id !== FLIGHT_TRACK_LAYER_CONFIG.id),
      }));
    },
    setClosestAirports(closestAirports: NearestStation[]): void {
      patchState(store, {
        closestAirports,
        closestAirportsLoading: false,
        focusedClosestAirportCode: null,
      });
    },
    setClosestAirportsLoading(closestAirportsLoading: boolean): void {
      patchState(store, { closestAirportsLoading });
    },
    focusClosestAirport(code: string | null): void {
      patchState(store, { focusedClosestAirportCode: code ? code.trim().toUpperCase() : null });
    },
    clearClosestAirports(): void {
      patchState(store, {
        closestAirports: [],
        closestAirportsLoading: false,
        focusedClosestAirportCode: null,
      });
    },
    flyTo(target: MapCameraTarget): void {
      patchState(store, { cameraTarget: target, cameraBounds: null });
    },
    fitBounds(bounds: MapCameraBounds): void {
      patchState(store, { cameraBounds: bounds, cameraTarget: null });
    },
  })),
);
