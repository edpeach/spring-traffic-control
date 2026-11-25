import { HttpAgent } from '@ag-ui/client';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AguiControlService } from '../../../core/services/agui-control.service';
import { Theme } from '../../../core/services/theme';
import { ScheduleStore } from '../../flights/store/schedule.store';
import { FlightPathsLayerStore } from '../../map/layers/flight-paths/flight-paths.store';
import { FlightStatesLayerStore } from '../../map/layers/flight-states/flight-states.store';
import { StationsLayerStore } from '../../map/layers/stations/stations.store';
import { MapStore } from '../../map/store/map.store';
import { stationRouteCode } from '../../stations/models/station.model';
import { StationStore } from '../../stations/store/station.store';
import { APP_VERSION } from '../config/agui-capabilities.config';
import { A2UiSurfaceState, AguiWebappAction } from '../models/agent-chat.model';
import { AgentChatStore } from '../store/agent-chat.store';

@Injectable({ providedIn: 'root' })
export class AguiClientService {
  private readonly store = inject(AgentChatStore);
  private readonly control = inject(AguiControlService);
  private readonly router = inject(Router);
  private readonly mapStore = inject(MapStore);
  private readonly flightStatesLayerStore = inject(FlightStatesLayerStore);
  private readonly flightPathsLayerStore = inject(FlightPathsLayerStore);
  private readonly stationsLayerStore = inject(StationsLayerStore);
  private readonly stationStore = inject(StationStore);
  private readonly scheduleStore = inject(ScheduleStore);
  private readonly theme = inject(Theme);

  async sendMessage(rawPrompt: string): Promise<void> {
    const prompt = rawPrompt.trim();
    if (!prompt || this.store.isStreaming()) return;

    this.store.appendUserMessage(prompt);

    const historyMessages = this.store
      .messages()
      .filter((m) => m.id !== this.store.activeAssistantMessageId())
      .map((m) => ({
        id: m.id,
        role: m.role,
        content: this.formatHistoryContent(m),
      }))
      .filter((m) => m.content.length > 0);

    const agent = new HttpAgent({
      url: '/api/agui',
      threadId: this.store.threadId(),
      initialMessages: historyMessages,
    });

    try {
      const uiState = this.buildUiStateContext();
      await agent.runAgent(
        {
          forwardedProps: {
            provider: this.store.provider(),
            appVersion: APP_VERSION,
            currentRoute: this.router.url,
            uiState,
          },
        },
        {
          onReasoningMessageContentEvent: ({ event }) => {
            this.store.appendReasoningDelta(event.delta);
          },
          onTextMessageContentEvent: ({ event }) => {
            this.store.appendTextDelta(event.delta);
          },
          onToolCallStartEvent: ({ event }) => {
            this.store.startToolCall(event.toolCallId, event.toolCallName);
          },
          onToolCallArgsEvent: ({ event }) => {
            this.store.appendToolCallArgs(event.toolCallId, event.delta);
          },
          onToolCallEndEvent: ({ event }) => {
            this.store.finishToolCall(event.toolCallId);
          },
          onActivitySnapshotEvent: ({ event }) => {
            if (event.activityType !== 'a2ui-surface') return;
            const content = event.content as Partial<A2UiSurfaceState> | null;
            if (!content?.component || !content.data) return;
            this.store.addSurface({
              surfaceId: content.surfaceId ?? event.messageId,
              component: content.component,
              data: content.data,
            });
          },
          onCustomEvent: ({ event }) => {
            if (event.name !== 'webapp:action') return;
            const value = event.value as Partial<AguiWebappAction> | null;
            if (!value?.action) return;
            this.control.enqueueAction({
              action: value.action,
              params: value.params ?? {},
            });
          },
          onRunErrorEvent: ({ event }) => {
            this.store.failTurn(event.message || 'Agent run failed.');
          },
          onRunFinishedEvent: () => {
            this.store.finishTurn();
          },
        },
      );

      if (this.store.isStreaming()) {
        this.store.finishTurn();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to reach the AI agent.';
      this.store.failTurn(message);
    }
  }

  private formatHistoryContent(message: {
    role: 'user' | 'assistant';
    text: string;
    surfaces: A2UiSurfaceState[];
    toolCalls: { name: string }[];
  }): string {
    const baseText = message.text.trim();
    if (message.role === 'user') {
      return baseText;
    }

    const surfaceNotes = message.surfaces
      .map((surface) => this.summarizeSurfaceForHistory(surface))
      .filter((note): note is string => Boolean(note));

    if (surfaceNotes.length === 0) {
      if (baseText) return baseText;
      if (message.toolCalls.length > 0) {
        return `[Executed tools: ${message.toolCalls.map((t) => t.name).join(', ')}]`;
      }
      return '';
    }

    const contextBlock = `[Displayed UI: ${surfaceNotes.join('; ')}]`;
    return baseText ? `${baseText}\n${contextBlock}` : contextBlock;
  }

  private summarizeSurfaceForHistory(surface: A2UiSurfaceState): string | null {
    const data = surface.data;
    if (surface.component === 'StationCard') {
      const station = data['station'] as Record<string, unknown> | undefined;
      if (!station) return null;
      const icao = typeof station['icao'] === 'string' ? station['icao'] : null;
      const iata = typeof station['iata'] === 'string' ? station['iata'] : null;
      const name = typeof station['name'] === 'string' ? station['name'] : null;
      const routeCode = icao || iata || (typeof station['id'] === 'string' ? station['id'] : null);
      return `StationCard(name=${name ?? '—'}, icao=${icao ?? '—'}, iata=${iata ?? '—'}, routeCode=${routeCode ?? '—'})`;
    }
    if (surface.component === 'FlightCard') {
      const flight = data['flight'] as Record<string, unknown> | undefined;
      if (!flight) return null;
      const flightName = typeof flight['flightName'] === 'string' ? flight['flightName'] : '—';
      const origin = typeof flight['originCode'] === 'string' ? flight['originCode'] : '—';
      const dest = typeof flight['destinationCode'] === 'string' ? flight['destinationCode'] : '—';
      return `FlightCard(flightName=${flightName}, route=${origin}->${dest})`;
    }
    if (surface.component === 'NearestAirportsCard') {
      const airports = Array.isArray(data['airports'])
        ? (data['airports'] as Record<string, unknown>[])
        : [];
      const codes = airports
        .map((entry) => {
          const st = entry['station'] as Record<string, unknown> | undefined;
          return (
            (typeof st?.['icao'] === 'string' && st['icao']) ||
            (typeof st?.['iata'] === 'string' && st['iata']) ||
            null
          );
        })
        .filter((c): c is string => Boolean(c));
      const icao24 = typeof data['icao24'] === 'string' ? data['icao24'] : null;
      return `NearestAirportsCard(${icao24 ? `icao24=${icao24}, ` : ''}airports=[${codes.join(', ')}])`;
    }
    return null;
  }

  buildUiStateContext(): Record<string, unknown> {
    const currentRoute = this.router.url;
    const currentPage = this.resolvePageName(currentRoute);

    let selectedLiveFlight: Record<string, unknown> | null = null;
    let selectedScheduledFlight: Record<string, unknown> | null = null;
    let selectedStations: Record<string, unknown>[] = [];

    if (currentPage === 'station-detail') {
      const detailStation = this.buildStationDetailContext(currentRoute);
      if (detailStation) {
        selectedStations = [detailStation];
      }
    } else if (currentPage === 'flight-detail') {
      const detailContext = this.buildFlightDetailContext(currentRoute);
      selectedScheduledFlight = detailContext.selectedScheduledFlight;
      selectedLiveFlight = detailContext.selectedLiveFlight;
    } else {
      const selectedItem = this.mapStore.selectedItem();

      const live = this.flightStatesLayerStore.selectedFlight();
      selectedLiveFlight = live
        ? this.toLiveFlightContext(live)
        : selectedItem?.kind === 'flight-state'
          ? { icao24: selectedItem.icao24 }
          : null;

      const scheduled = this.flightPathsLayerStore.selectedFlight();
      selectedScheduledFlight = scheduled
        ? this.toScheduledFlightContext(scheduled)
        : selectedItem?.kind === 'flight'
          ? { flightName: selectedItem.flightName }
          : null;

      selectedStations = this.buildSelectedStationsContext();
    }

    return {
      currentPage,
      theme: this.theme.theme(),
      colorMode: this.theme.mode(),
      mapProjection: this.mapStore.projection(),
      ...(selectedLiveFlight ? { selectedLiveFlight } : {}),
      ...(selectedScheduledFlight ? { selectedScheduledFlight } : {}),
      ...(selectedStations.length > 0 ? { selectedStations } : {}),
    };
  }

  private toLiveFlightContext(live: {
    state: {
      icao24: string;
      callsign?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      baroAltitude?: number | null;
      onGround?: boolean | null;
    };
    schedule?: { flightName: string } | null;
    originCode?: string | null;
    destinationCode?: string | null;
  }): Record<string, unknown> {
    return {
      icao24: live.state.icao24,
      callsign: live.state.callsign?.trim() ?? null,
      flightName: live.schedule?.flightName ?? null,
      originCode: live.originCode ?? null,
      destinationCode: live.destinationCode ?? null,
      latitude: live.state.latitude ?? null,
      longitude: live.state.longitude ?? null,
      altitudeMeters: live.state.baroAltitude ?? null,
      onGround: live.state.onGround ?? null,
    };
  }

  private toScheduledFlightContext(flight: {
    flightName: string;
    originCode?: string | null;
    destinationCode?: string | null;
    flightDirection?: string | null;
    gate?: string | null;
  }): Record<string, unknown> {
    return {
      flightName: flight.flightName,
      originCode: flight.originCode ?? null,
      destinationCode: flight.destinationCode ?? null,
      flightDirection: flight.flightDirection ?? null,
      gate: flight.gate ?? null,
    };
  }

  private extractRouteParam(route: string, prefix: string): string | null {
    const path = route.split('?')[0].split('#')[0];
    if (!path.startsWith(prefix)) return null;
    const raw = path.slice(prefix.length).split('/')[0]?.trim();
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }

  private buildStationDetailContext(route: string): Record<string, unknown> | null {
    const routeCode = this.extractRouteParam(route, '/stations/');
    const normalized = routeCode?.toUpperCase() ?? null;
    const storeStation = this.stationStore.selectedStation();

    const matchesRoute = (
      s: { id: string; icao?: string | null; iata?: string | null } | null,
    ): boolean => {
      if (!s) return false;
      if (!normalized) return true;
      return (
        s.icao?.toUpperCase() === normalized ||
        s.iata?.toUpperCase() === normalized ||
        s.id.toUpperCase() === normalized
      );
    };

    const station = matchesRoute(storeStation)
      ? storeStation
      : normalized
        ? (this.stationStore.stations().find((s) => matchesRoute(s)) ?? null)
        : storeStation;

    if (station) {
      return {
        code: stationRouteCode(station),
        name: station.name,
        icao: station.icao ?? null,
        iata: station.iata ?? null,
        city: station.city ?? null,
        country: station.country ?? null,
        primary: true,
      };
    }

    if (routeCode) {
      return {
        code: routeCode.toUpperCase(),
        name: null,
        icao: null,
        iata: null,
        city: null,
        country: null,
        primary: true,
      };
    }

    return null;
  }

  private buildFlightDetailContext(route: string): {
    selectedScheduledFlight: Record<string, unknown> | null;
    selectedLiveFlight: Record<string, unknown> | null;
  } {
    const routeFlightName = this.extractRouteParam(route, '/flights/');
    const normalized = routeFlightName?.toUpperCase() ?? null;
    const matches = this.scheduleStore.selectedFlightMatches();

    const scheduled =
      (normalized ? matches.find((f) => f.flightName.toUpperCase() === normalized) : null) ??
      matches[0] ??
      (normalized
        ? this.scheduleStore.flights().find((f) => f.flightName.toUpperCase() === normalized)
        : null) ??
      null;

    const selectedScheduledFlight = scheduled
      ? this.toScheduledFlightContext(scheduled)
      : routeFlightName
        ? this.toScheduledFlightContext({ flightName: routeFlightName.toUpperCase() })
        : null;

    const targetName = (scheduled?.flightName ?? routeFlightName)?.toUpperCase() ?? null;
    const live = targetName
      ? (this.flightStatesLayerStore
          .liveFlights()
          .find(
            (f) =>
              f.schedule?.flightName.toUpperCase() === targetName ||
              f.displayCallsign.toUpperCase() === targetName ||
              f.state.callsign?.trim().toUpperCase() === targetName,
          ) ?? null)
      : null;

    const selectedLiveFlight = live ? this.toLiveFlightContext(live) : null;

    return { selectedScheduledFlight, selectedLiveFlight };
  }

  private resolvePageName(route: string): string {
    const path = route.split('?')[0];
    if (path.startsWith('/map')) return 'map';
    if (path.startsWith('/stations/')) return 'station-detail';
    if (path.startsWith('/stations')) return 'stations';
    if (path.startsWith('/flights/')) return 'flight-detail';
    if (path.startsWith('/flights')) return 'flights';
    if (path.startsWith('/agent')) return 'agent';
    return 'home';
  }

  private buildSelectedStationsContext(): Record<string, unknown>[] {
    const byKey = new Map<string, Record<string, unknown>>();
    const focusedCode = this.mapStore.focusedClosestAirportCode()?.toUpperCase() ?? null;

    const addStation = (
      code: string,
      station: {
        id: string;
        name: string;
        icao?: string | null;
        iata?: string | null;
        city?: string | null;
        country?: string | null;
      } | null,
      extra: Record<string, unknown> = {},
    ) => {
      const key = (station?.id ?? code).toUpperCase();
      const existing = byKey.get(key) ?? {};
      byKey.set(key, {
        ...existing,
        code,
        name: station?.name ?? existing['name'] ?? null,
        icao: station?.icao ?? existing['icao'] ?? null,
        iata: station?.iata ?? existing['iata'] ?? null,
        city: station?.city ?? existing['city'] ?? null,
        country: station?.country ?? existing['country'] ?? null,
        ...extra,
      });
    };

    const primaryStation = this.stationsLayerStore.selectedStation();
    const selectedItem = this.mapStore.selectedItem();
    if (primaryStation) {
      addStation(stationRouteCode(primaryStation), primaryStation, { primary: true });
    } else if (selectedItem?.kind === 'station') {
      addStation(selectedItem.code, null, { primary: true });
    }

    for (const entry of this.mapStore.closestAirports()) {
      const code = stationRouteCode(entry.station);
      const isFocused =
        focusedCode != null &&
        (code.toUpperCase() === focusedCode ||
          entry.station.icao?.toUpperCase() === focusedCode ||
          entry.station.iata?.toUpperCase() === focusedCode);
      addStation(code, entry.station, {
        distanceKm: Number(entry.distanceKm.toFixed(1)),
        ...(isFocused ? { focused: true } : {}),
      });
    }

    const highlightedCodes = this.stationsLayerStore.highlightedCodes();
    if (highlightedCodes.length > 0) {
      const allStations = this.stationStore.stations();
      for (const rawCode of highlightedCodes) {
        const normalized = rawCode.trim().toUpperCase();
        if (!normalized) continue;
        const match = allStations.find(
          (s) =>
            s.icao?.toUpperCase() === normalized ||
            s.iata?.toUpperCase() === normalized ||
            s.id.toUpperCase() === normalized,
        );
        if (match) {
          addStation(stationRouteCode(match), match);
        } else {
          addStation(normalized, null);
        }
      }
    }

    return Array.from(byKey.values());
  }
}
