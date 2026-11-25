import { NgComponentOutlet } from '@angular/common';
import {
  Component,
  computed,
  effect,
  inject,
  input,
  OutputRefSubscription,
  Type,
  viewChild,
} from '@angular/core';
import { AguiControlService } from '../../../../core/services/agui-control.service';
import { FlightCard } from '../../../flights/components/flight-card/flight-card';
import { StationCard } from '../../../stations/components/station-card/station-card';
import { stationRouteCode } from '../../../stations/models/station.model';
import { A2UI_SURFACE_REGISTRY } from '../../config/a2ui-surface.registry';
import { A2UiSurfaceState } from '../../models/agent-chat.model';
import { NearestAirportsCard } from '../nearest-airports-card/nearest-airports-card';

interface ResolvedSurface {
  component: Type<unknown>;
  inputs: Record<string, unknown>;
}

@Component({
  selector: 'app-a2ui-surface-host',
  imports: [NgComponentOutlet],
  templateUrl: './a2ui-surface-host.html',
  styleUrl: './a2ui-surface-host.css',
})
export class A2UiSurfaceHost {
  readonly surface = input.required<A2UiSurfaceState>();

  private readonly control = inject(AguiControlService);
  private readonly outlet = viewChild(NgComponentOutlet);

  protected readonly resolved = computed<ResolvedSurface | null>(() => {
    const { component, data } = this.surface();
    const binding = A2UI_SURFACE_REGISTRY[component];
    if (!binding) return null;
    try {
      return {
        component: binding.component,
        inputs: binding.mapInputs(data),
      };
    } catch {
      return null;
    }
  });

  constructor() {
    effect((onCleanup) => {
      this.resolved();
      const instance = this.outlet()?.componentInstance;
      if (!instance) return;

      const subs: OutputRefSubscription[] = [];

      if (instance instanceof StationCard) {
        subs.push(
          instance.showOnMap.subscribe((station) => {
            this.control.enqueueAction({
              action: 'selectStationOnMap',
              params: { code: stationRouteCode(station) },
            });
          }),
          instance.viewDetails.subscribe((station) => {
            this.control.enqueueAction({
              action: 'navigate',
              params: { route: `/stations/${stationRouteCode(station)}` },
            });
          }),
        );
      } else if (instance instanceof FlightCard) {
        subs.push(
          instance.viewDetails.subscribe((flight) => {
            this.control.enqueueAction({
              action: 'navigate',
              params: { route: `/flights/${flight.flightName}` },
            });
          }),
        );
      } else if (instance instanceof NearestAirportsCard) {
        subs.push(
          instance.selectStation.subscribe((station) => {
            this.control.enqueueAction({
              action: 'selectStationOnMap',
              params: { code: stationRouteCode(station) },
            });
          }),
        );
      }

      onCleanup(() => subs.forEach((sub) => sub.unsubscribe()));
    });
  }
}
