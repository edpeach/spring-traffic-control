import { Type } from '@angular/core';
import { FlightCard } from '../../flights/components/flight-card/flight-card';
import { ScheduledFlightSchema } from '../../flights/models/schedule.model';
import { StationCard } from '../../stations/components/station-card/station-card';
import { StationSchema } from '../../stations/models/station.model';
import { NearestAirportsCard } from '../components/nearest-airports-card/nearest-airports-card';
import { NearestAirportsSurfaceSchema } from '../models/agent-chat.model';

export interface A2UiSurfaceBinding {
  component: Type<unknown>;
  mapInputs: (data: Record<string, unknown>) => Record<string, unknown>;
}

export const A2UI_SURFACE_REGISTRY: Record<string, A2UiSurfaceBinding> = {
  StationCard: {
    component: StationCard,
    mapInputs: (data) => ({
      station: StationSchema.parse(data['station']),
    }),
  },
  FlightCard: {
    component: FlightCard,
    mapInputs: (data) => ({
      flight: ScheduledFlightSchema.parse(data['flight']),
    }),
  },
  NearestAirportsCard: {
    component: NearestAirportsCard,
    mapInputs: (data) => {
      const parsed = NearestAirportsSurfaceSchema.parse(data);
      return {
        airports: parsed.airports,
        icao24: parsed.icao24 ?? null,
        emergencyOnly: parsed.emergencyOnly,
      };
    },
  },
};
