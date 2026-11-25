import { HttpClient } from '@angular/common/http';
import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';
import { z } from 'zod';
import {
  AGUI_CAPABILITIES,
  NavigateActionSchema,
  SelectFlightActionSchema,
  SelectStationActionSchema,
  SetColorModeActionSchema,
  SetMapProjectionActionSchema,
  SetThemeActionSchema,
  ShowClosestAirportsActionSchema,
  ToggleMapLayerActionSchema,
} from '../../features/agent/config/agui-capabilities.config';
import {
  AguiWebappAction,
  ProviderStatusSchema,
} from '../../features/agent/models/agent-chat.model';
import { AgentChatStore } from '../../features/agent/store/agent-chat.store';
import { FlightState } from '../../features/flights/services/flight-state';
import { MAP_CONFIG, MapLayerId } from '../../features/map/config/map.config';
import { FlightStatesLayerStore } from '../../features/map/layers/flight-states/flight-states.store';
import { StationsLayerStore } from '../../features/map/layers/stations/stations.store';
import { MapStore } from '../../features/map/store/map.store';
import { StationStore } from '../../features/stations/store/station.store';
import { Theme } from './theme';

const ProviderListSchema = z.array(ProviderStatusSchema);

const LAYER_ALIASES: Record<string, MapLayerId> = {
  'day night': 'day-night',
  daynight: 'day-night',
  day: 'day-night',
  night: 'day-night',
  terminator: 'day-night',
  solar: 'day-night',
  stations: 'stations',
  station: 'stations',
  airports: 'stations',
  airport: 'stations',
  'flight paths': 'flight-paths',
  flightpaths: 'flight-paths',
  paths: 'flight-paths',
  routes: 'flight-paths',
  arcs: 'flight-paths',
  'flight states': 'flight-states',
  flightstates: 'flight-states',
  'live flights': 'flight-states',
  liveflights: 'flight-states',
  flights: 'flight-states',
  aircraft: 'flight-states',
  planes: 'flight-states',
  'flight track': 'flight-track',
  flighttrack: 'flight-track',
  track: 'flight-track',
  trail: 'flight-track',
};

@Injectable({ providedIn: 'root' })
export class AguiControlService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly mapStore = inject(MapStore);
  private readonly stationStore = inject(StationStore);
  private readonly stationsLayerStore = inject(StationsLayerStore);
  private readonly flightStatesLayerStore = inject(FlightStatesLayerStore);
  private readonly flightStateService = inject(FlightState);
  private readonly agentChatStore = inject(AgentChatStore);
  private readonly theme = inject(Theme);

  private readonly actionQueue = signal<AguiWebappAction[]>([]);

  constructor() {
    effect(() => {
      const queue = this.actionQueue();
      if (queue.length === 0) return;

      const [next, ...rest] = queue;
      untracked(() => {
        this.executeAction(next);
        this.actionQueue.set(rest);
      });
    });
  }

  /**
   * Syncs available A2UI surfaces and AG-UI actions with the backend once on app startup
   * and fetches available LLM providers (Ollama / Gemini).
   */
  async syncCapabilities(): Promise<void> {
    await Promise.all([
      firstValueFrom(
        this.http.post('/api/agui/sync', AGUI_CAPABILITIES).pipe(catchError(() => of(null))),
      ),
      firstValueFrom(
        this.http.get<unknown>('/api/agui/providers').pipe(catchError(() => of(null))),
      ).then((raw) => {
        if (!raw) return;
        const parsed = ProviderListSchema.safeParse(raw);
        if (parsed.success) {
          this.agentChatStore.setProviders(parsed.data);
        }
      }),
    ]);
  }

  enqueueAction(action: AguiWebappAction): void {
    this.actionQueue.update((queue) => [...queue, action]);
  }

  private executeAction(item: AguiWebappAction): void {
    switch (item.action) {
      case 'navigate': {
        const parsed = NavigateActionSchema.safeParse(item.params);
        if (!parsed.success) return;
        this.navigateWithDrawerHandoff(parsed.data.route);
        break;
      }
      case 'selectStationOnMap': {
        const rawCode =
          (typeof item.params['code'] === 'string' && item.params['code']) ||
          (typeof item.params['icao'] === 'string' && item.params['icao']) ||
          (typeof item.params['iata'] === 'string' && item.params['iata']) ||
          (typeof item.params['stationCode'] === 'string' && item.params['stationCode']) ||
          (typeof item.params['station'] === 'string' && item.params['station']) ||
          '';
        const parsed = SelectStationActionSchema.safeParse({ code: rawCode.trim() });
        if (!parsed.success || !parsed.data.code) return;
        this.ensureMapRoute();
        this.mapStore.toggleLayer('stations', true);
        this.stationsLayerStore.selectStation(parsed.data.code);
        this.mapStore.selectStation(parsed.data.code);
        this.flyToStationIfKnown(parsed.data.code);
        break;
      }
      case 'selectFlightOnMap': {
        const parsed = SelectFlightActionSchema.safeParse(item.params);
        if (!parsed.success) return;
        const resolvedIcao24 = this.resolveIcao24(parsed.data.icao24);
        this.ensureMapRoute();
        this.mapStore.toggleLayer('flight-states', true);
        this.flightStatesLayerStore.selectFlightState(resolvedIcao24);
        this.mapStore.selectFlightState(resolvedIcao24);
        this.flyToFlightIfKnown(resolvedIcao24);
        break;
      }
      case 'showClosestAirportsOnMap': {
        const parsed = ShowClosestAirportsActionSchema.safeParse(item.params);
        if (!parsed.success) return;
        const { limit, emergencyOnly, stationCodes } = parsed.data;
        const resolvedIcao24 = this.resolveIcao24(parsed.data.icao24);
        this.ensureMapRoute();
        this.mapStore.toggleLayer('stations', true);
        this.mapStore.toggleLayer('flight-states', true);
        this.flightStatesLayerStore.selectFlightState(resolvedIcao24);
        this.mapStore.selectFlightState(resolvedIcao24);
        if (stationCodes && stationCodes.length > 0) {
          this.stationsLayerStore.setHighlightedCodes(stationCodes);
        }
        this.flightStateService.loadNearestAirports(resolvedIcao24, limit, emergencyOnly);
        this.flyToFlightIfKnown(resolvedIcao24);
        break;
      }
      case 'setMapProjection': {
        const parsed = SetMapProjectionActionSchema.safeParse(item.params);
        if (!parsed.success) return;
        this.ensureMapRoute();
        this.mapStore.setProjection(parsed.data.projection);
        break;
      }
      case 'toggleMapLayer': {
        const rawLayer =
          (typeof item.params['layerId'] === 'string' && item.params['layerId']) ||
          (typeof item.params['layer'] === 'string' && item.params['layer']) ||
          (typeof item.params['name'] === 'string' && item.params['name']) ||
          '';
        const resolvedLayerId = this.resolveLayerId(rawLayer);
        if (!resolvedLayerId) return;
        const parsed = ToggleMapLayerActionSchema.safeParse({
          layerId: resolvedLayerId,
          ...(typeof item.params['visible'] === 'boolean'
            ? { visible: item.params['visible'] }
            : {}),
        });
        if (!parsed.success) return;
        this.ensureMapRoute();
        this.mapStore.toggleLayer(parsed.data.layerId, parsed.data.visible);
        break;
      }
      case 'setTheme': {
        const rawTheme =
          typeof item.params['theme'] === 'string'
            ? item.params['theme'].trim().toLowerCase()
            : undefined;
        const parsed = SetThemeActionSchema.safeParse({
          ...(rawTheme ? { theme: rawTheme } : {}),
        });
        if (!parsed.success) return;
        if (parsed.data.theme) {
          this.theme.setTheme(parsed.data.theme);
        } else {
          this.theme.cycleTheme();
        }
        break;
      }
      case 'setColorMode': {
        const rawMode =
          typeof item.params['mode'] === 'string'
            ? item.params['mode'].trim().toLowerCase()
            : undefined;
        const parsed = SetColorModeActionSchema.safeParse({
          ...(rawMode ? { mode: rawMode } : {}),
        });
        if (!parsed.success) return;
        if (parsed.data.mode) {
          this.theme.setMode(parsed.data.mode);
        } else {
          this.theme.toggleMode();
        }
        break;
      }
      default:
        break;
    }
  }

  private navigateWithDrawerHandoff(route: string): void {
    const normalized = route.startsWith('/') ? route : `/${route}`;
    const wasOnAgentPage = this.router.url.startsWith('/agent');
    if (wasOnAgentPage && !normalized.startsWith('/agent')) {
      this.agentChatStore.openDrawer();
    }
    void this.router.navigateByUrl(normalized);
  }

  private ensureMapRoute(): void {
    if (!this.router.url.startsWith('/map')) {
      this.navigateWithDrawerHandoff('/map');
    }
  }

  private resolveLayerId(raw: string): MapLayerId | null {
    const normalized = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
    return LAYER_ALIASES[normalized] ?? null;
  }

  private resolveIcao24(identifier: string): string {
    const trimmed = identifier.trim();
    const lower = trimmed.toLowerCase();
    const upper = trimmed.toUpperCase();
    const states = this.flightStatesLayerStore.states();
    const byIcao24 = states.find((s) => s.icao24.trim().toLowerCase() === lower);
    if (byIcao24) return byIcao24.icao24.trim().toLowerCase();

    const byCallsign = states.find((s) => s.callsign?.trim().toUpperCase() === upper);
    if (byCallsign) return byCallsign.icao24.trim().toLowerCase();

    const byLiveFlight = this.flightStatesLayerStore
      .liveFlights()
      .find(
        (f) =>
          f.displayCallsign.toUpperCase() === upper ||
          f.schedule?.flightName.toUpperCase() === upper,
      );
    return byLiveFlight ? byLiveFlight.state.icao24.trim().toLowerCase() : lower;
  }

  private flyToStationIfKnown(code: string): void {
    const normalized = code.trim().toUpperCase();
    const matches = (s: { id: string; icao?: string | null; iata?: string | null } | null) =>
      s != null &&
      (s.icao?.toUpperCase() === normalized ||
        s.iata?.toUpperCase() === normalized ||
        s.id.toUpperCase() === normalized);

    const detailStation = this.stationStore.selectedStation();
    const station = matches(detailStation)
      ? detailStation
      : (this.stationStore.stations().find((s) => matches(s)) ?? null);

    if (station?.latitude != null && station.longitude != null) {
      this.mapStore.flyTo({
        longitude: station.longitude,
        latitude: station.latitude,
        zoom: MAP_CONFIG.selectionZoom,
      });
    }
  }

  private flyToFlightIfKnown(icao24: string): void {
    const normalized = icao24.trim().toLowerCase();
    const state = this.flightStatesLayerStore
      .states()
      .find((s) => s.icao24.trim().toLowerCase() === normalized);
    if (state?.latitude != null && state.longitude != null) {
      this.mapStore.flyTo({
        longitude: state.longitude,
        latitude: state.latitude,
        zoom: MAP_CONFIG.flightSelectionZoom,
      });
    }
  }
}
