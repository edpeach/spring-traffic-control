import { z } from 'zod';
import { SCHEDULED_FLIGHT_JSON_SCHEMA } from '../../flights/models/schedule.model';
import { STATION_JSON_SCHEMA } from '../../stations/models/station.model';
import { NEAREST_AIRPORTS_JSON_SCHEMA } from '../models/agent-chat.model';

export const APP_VERSION = '0.1.0';

export const NavigateActionSchema = z
  .object({
    route: z
      .string()
      .describe(
        'Target route path: /map, /stations, /stations/{code}, /flights, /flights/{flightName}, or /agent',
      ),
  })
  .describe('Navigate to an application route');

export const SelectStationActionSchema = z
  .object({
    code: z.string().describe('Airport ICAO or IATA code, e.g. EHAM or AMS'),
  })
  .describe('Open /map if needed, select a station, and fly camera to it');

export const SelectFlightActionSchema = z
  .object({
    icao24: z.string().describe('Live aircraft ICAO24 transponder hex'),
  })
  .describe('Open /map if needed, select a live flight, load its track, and fly camera to it');

export const ShowClosestAirportsActionSchema = z
  .object({
    icao24: z.string().describe('Live aircraft ICAO24 transponder hex'),
    limit: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(5)
      .describe('Number of closest airports to highlight'),
    emergencyOnly: z
      .boolean()
      .default(false)
      .describe('Filter to emergency medical capable airports'),
    stationCodes: z
      .array(z.string())
      .optional()
      .describe('Optional station ICAO/IATA codes to highlight immediately'),
  })
  .describe('Open /map, select the flight, and highlight its closest airports on the map');

export const SetMapProjectionActionSchema = z
  .object({
    projection: z.enum(['globe', 'mercator']).describe('Map projection type'),
  })
  .describe('Switch map projection between globe and mercator');

export const ToggleMapLayerActionSchema = z
  .object({
    layerId: z
      .enum(['day-night', 'stations', 'flight-paths', 'flight-states', 'flight-track'])
      .describe('Map layer identifier'),
    visible: z.boolean().optional().describe('Explicit visibility; omit to toggle'),
  })
  .describe('Show, hide, or toggle a map layer');

export const SetThemeActionSchema = z
  .object({
    theme: z
      .enum(['spring', 'summer', 'autumn', 'winter'])
      .optional()
      .describe('Seasonal theme (spring, summer, autumn, winter); omit to cycle to the next theme'),
  })
  .describe('Switch or cycle the seasonal UI theme');

export const SetColorModeActionSchema = z
  .object({
    mode: z
      .enum(['dark', 'light'])
      .optional()
      .describe('Color mode (dark or light); omit to toggle between dark and light mode'),
  })
  .describe('Switch or toggle between dark and light mode');

export const AGUI_CAPABILITIES = {
  appVersion: APP_VERSION,
  surfaces: [
    {
      name: 'StationCard',
      description:
        'Displays airport/station telemetry, runways, opening hours, and emergency capabilities',
      schema: STATION_JSON_SCHEMA,
    },
    {
      name: 'FlightCard',
      description: 'Displays a scheduled flight with route, gate, times, and status',
      schema: SCHEDULED_FLIGHT_JSON_SCHEMA,
    },
    {
      name: 'NearestAirportsCard',
      description: 'Displays a ranked list of closest airports with distances in km',
      schema: NEAREST_AIRPORTS_JSON_SCHEMA,
    },
  ],
  actions: [
    {
      name: 'navigate',
      description:
        'Navigate to /map, /stations, /stations/{code}, /flights, /flights/{flightName}, or /agent',
      parametersSchema: z.toJSONSchema(NavigateActionSchema),
    },
    {
      name: 'selectStationOnMap',
      description: 'Open /map, select an airport by ICAO/IATA code, and fly camera to it',
      parametersSchema: z.toJSONSchema(SelectStationActionSchema),
    },
    {
      name: 'selectFlightOnMap',
      description:
        'Open /map, select a live flight by icao24, load its track, and fly camera to it',
      parametersSchema: z.toJSONSchema(SelectFlightActionSchema),
    },
    {
      name: 'showClosestAirportsOnMap',
      description:
        'Open /map, select a live flight by icao24, and highlight the N closest airports on the map and in the map side panel',
      parametersSchema: z.toJSONSchema(ShowClosestAirportsActionSchema),
    },
    {
      name: 'setMapProjection',
      description: 'Switch map projection between globe and mercator',
      parametersSchema: z.toJSONSchema(SetMapProjectionActionSchema),
    },
    {
      name: 'toggleMapLayer',
      description:
        'Show, hide, or toggle a map layer by name or ID: Day / Night (day-night), Stations / Airports (stations), Flight Paths (flight-paths), Live Flights (flight-states), or Flight Track (flight-track)',
      parametersSchema: z.toJSONSchema(ToggleMapLayerActionSchema),
    },
    {
      name: 'setTheme',
      description:
        'Switch the UI theme to spring, summer, autumn, or winter, or omit theme to cycle to the next seasonal theme',
      parametersSchema: z.toJSONSchema(SetThemeActionSchema),
    },
    {
      name: 'setColorMode',
      description:
        'Switch the UI color mode to dark or light, or omit mode to toggle between dark and light mode',
      parametersSchema: z.toJSONSchema(SetColorModeActionSchema),
    },
  ],
} as const;
