import { z } from 'zod';

export const StationKindSchema = z
  .enum(['AIRPORT', 'RAIL'])
  .describe('Kind of transport station (AIRPORT or RAIL)');

export const AircraftCategorySchema = z
  .enum(['LIGHT', 'REGIONAL', 'NARROW_BODY', 'WIDE_BODY'])
  .describe('Maximum aircraft category supported by the station runways');

export const OpeningHoursSchema = z
  .object({
    alwaysOpen: z.boolean().default(true).describe('Whether the station operates 24/7'),
    openUtc: z.string().nullable().optional().describe('Opening time in UTC (HH:mm:ss)'),
    closeUtc: z.string().nullable().optional().describe('Closing time in UTC (HH:mm:ss)'),
  })
  .describe('Station operating hours in UTC');

export const RunwaySchema = z
  .object({
    id: z.string().describe('Unique runway identifier'),
    designator: z.string().describe('Runway designator (e.g. 18R, 36L)'),
    trueHeading: z.number().describe('True heading in degrees'),
    mainRunway: z.boolean().default(false).describe('Whether this is the main runway'),
    takeOffOnly: z.boolean().default(false).describe('Restricted to takeoffs only'),
    landingOnly: z.boolean().default(false).describe('Restricted to landings only'),
    lengthMeters: z.number().describe('Runway length in meters'),
    widthMeters: z.number().describe('Runway width in meters'),
    toraMeters: z.number().nullable().optional().describe('Take-Off Run Available in meters'),
    todaMeters: z.number().nullable().optional().describe('Take-Off Distance Available in meters'),
    asdaMeters: z
      .number()
      .nullable()
      .optional()
      .describe('Accelerate-Stop Distance Available in meters'),
    ldaMeters: z.number().nullable().optional().describe('Landing Distance Available in meters'),
    surfaceType: z.string().describe('Primary runway surface composition'),
    pcn: z.string().nullable().optional().describe('Pavement Classification Number'),
    pilotControlledLighting: z.boolean().default(false).describe('Has pilot-controlled lighting'),
  })
  .describe('Individual runway details');

export const StationFrequencySchema = z
  .object({
    id: z.string().describe('Unique frequency identifier'),
    value: z.string().describe('Radio frequency value in MHz'),
    type: z.string().describe('Frequency role (e.g. TOWER, GROUND, ATIS)'),
    name: z.string().nullable().optional().describe('Human-readable frequency callsign or name'),
    primary: z.boolean().default(false).describe('Whether this is the primary station frequency'),
    publicUse: z.boolean().default(true).describe('Whether the frequency is open for public use'),
  })
  .describe('Station radio communication frequency');

export const StationSchema = z
  .object({
    id: z.string().describe('Unique station identifier'),
    kind: StationKindSchema.default('AIRPORT'),
    name: z.string().describe('Official station or airport name'),
    city: z.string().nullable().optional().describe('City served by the station'),
    country: z.string().nullable().optional().describe('ISO 2-letter country code'),
    iata: z.string().nullable().optional().describe('3-letter IATA airport code'),
    icao: z.string().nullable().optional().describe('4-letter ICAO airport code'),
    latitude: z.number().nullable().optional().describe('Latitude in decimal degrees'),
    longitude: z.number().nullable().optional().describe('Longitude in decimal degrees'),
    elevationMeters: z
      .number()
      .nullable()
      .optional()
      .describe('Elevation above mean sea level in meters'),
    airportType: z
      .string()
      .nullable()
      .optional()
      .describe('Decoded OpenAIP airport classification'),
    trafficTypes: z
      .array(z.string())
      .default([])
      .describe('Supported traffic rules (e.g. VFR, IFR)'),
    ppr: z.boolean().default(false).describe('Prior Permission Required (PPR)'),
    isPrivate: z.boolean().default(false).describe('Whether the airfield is private'),
    skydiveActivity: z
      .boolean()
      .default(false)
      .describe('Active skydiving operations at the airfield'),
    winchOnly: z.boolean().default(false).describe('Winch-launch only glider operations'),
    timezone: z.string().nullable().optional().describe('IANA timezone identifier'),
    contactPhone: z.string().nullable().optional().describe('Contact phone number'),
    contactEmail: z.string().nullable().optional().describe('Contact email address'),
    openingHours: OpeningHoursSchema.default({ alwaysOpen: true }),
    maxRunwayMeters: z.number().nullable().optional().describe('Longest runway length in meters'),
    maxAircraftCategory: AircraftCategorySchema.default('LIGHT'),
    runwayCount: z.number().default(0).describe('Total number of runways'),
    primaryFrequency: z
      .string()
      .nullable()
      .optional()
      .describe('Primary tower/station radio frequency in MHz'),
    emergencyMedicalCapable: z
      .boolean()
      .default(false)
      .describe('Capable of emergency medical diversion'),
    runways: z.array(RunwaySchema).default([]).describe('Detailed list of runways'),
    frequencies: z
      .array(StationFrequencySchema)
      .default([])
      .describe('Detailed list of radio frequencies'),
  })
  .describe('Airport or rail station telemetry and operational metadata');

export type StationKind = z.infer<typeof StationKindSchema>;
export type AircraftCategory = z.infer<typeof AircraftCategorySchema>;
export type OpeningHours = z.infer<typeof OpeningHoursSchema>;
export type Runway = z.infer<typeof RunwaySchema>;
export type StationFrequency = z.infer<typeof StationFrequencySchema>;
export type Station = z.infer<typeof StationSchema>;

export const NearestStationSchema = z
  .object({
    station: StationSchema,
    distanceKm: z.number().describe('Great-circle distance in kilometers'),
  })
  .describe('Airport or station paired with its distance in kilometers');

export type NearestStation = z.infer<typeof NearestStationSchema>;

export const StationSyncRequestSchema = z
  .object({
    country: z
      .string()
      .nullable()
      .optional()
      .describe('ISO 2-letter country code to sync (e.g. NL)'),
    search: z.string().nullable().optional().describe('Optional name or code search filter'),
    type: z.array(z.number()).nullable().optional().describe('OpenAIP airport type codes'),
    trafficType: z
      .array(z.number())
      .nullable()
      .optional()
      .describe('OpenAIP traffic type codes (0=VFR, 1=IFR)'),
    ppr: z.boolean().nullable().optional().describe('Filter by Prior Permission Required'),
    isPrivate: z.boolean().nullable().optional().describe('Filter by private airfields'),
    skydiveActivity: z.boolean().nullable().optional().describe('Filter by skydive activity'),
    winchOnly: z.boolean().nullable().optional().describe('Filter by winch-only glider sites'),
    limit: z.number().int().min(1).max(1000).default(100).describe('Max items per OpenAIP page'),
    maxPages: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(5)
      .describe('Max pages to fetch from OpenAIP'),
  })
  .describe('Configuration for syncing airports from OpenAIP');

export const StationSyncResultSchema = z.object({
  syncedCount: z.number(),
  pagesFetched: z.number(),
  totalAvailable: z.number(),
});

export type StationSyncRequest = z.infer<typeof StationSyncRequestSchema>;
export type StationSyncResult = z.infer<typeof StationSyncResultSchema>;

export const OPENAIP_AIRPORT_TYPES: readonly { code: number; label: string }[] = [
  { code: 3, label: 'International Airport' },
  { code: 2, label: 'Civil Airfield' },
  { code: 6, label: 'Light Aircraft' },
  { code: 1, label: 'Glider Site' },
  { code: 7, label: 'Civil Heliport' },
  { code: 5, label: 'Military Airfield' },
  { code: 11, label: 'Landing Strip' },
];

export const OPENAIP_TRAFFIC_TYPES: readonly { code: number; label: string }[] = [
  { code: 0, label: 'VFR' },
  { code: 1, label: 'IFR' },
];

export const STATION_JSON_SCHEMA = z.toJSONSchema(StationSchema);

export function stationRouteCode(station: Station): string {
  return station.icao || station.iata || station.id;
}

export function formatAirportType(type: string | null | undefined): string {
  if (!type) return 'Unknown';
  return type
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function formatCoordinates(
  lat: number | null | undefined,
  lon: number | null | undefined,
): string {
  if (lat == null || lon == null) return '—';
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(3)}°${latDir}, ${Math.abs(lon).toFixed(3)}°${lonDir}`;
}

export function formatElevation(elevationMeters: number | null | undefined): string {
  if (elevationMeters == null) return '—';
  return `${Math.round(elevationMeters)} m`;
}
