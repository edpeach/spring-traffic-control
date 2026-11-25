import { z } from 'zod';

export const FlightDirectionSchema = z
  .enum(['A', 'D'])
  .describe('Flight direction at AMS: A = Arrival, D = Departure');

export const CheckinDeskSchema = z
  .object({
    position: z.number().nullable().optional().describe('Check-in desk number'),
    classCode: z.string().nullable().optional().describe('Passenger class code'),
    classDescription: z.string().nullable().optional().describe('Passenger class description'),
  })
  .describe('Check-in desk assignment');

export const CheckinRowSchema = z
  .object({
    position: z.string().nullable().optional().describe('Check-in row number'),
    desks: z.array(CheckinDeskSchema).default([]).describe('Desks in this check-in row'),
  })
  .describe('Check-in row assignment');

export const CheckinAllocationSchema = z
  .object({
    startTime: z.string().nullable().optional().describe('Check-in window start (ISO-8601)'),
    endTime: z.string().nullable().optional().describe('Check-in window end (ISO-8601)'),
    rows: z.array(CheckinRowSchema).default([]).describe('Allocated check-in rows'),
  })
  .describe('Check-in allocation window and rows');

export const ScheduledFlightSchema = z
  .object({
    id: z.string().describe('Unique Schiphol flight identifier'),
    flightName: z.string().describe('Primary ticket flight number (e.g. KL1051, VS6946)'),
    flightNumber: z.number().nullable().optional().describe('Numeric flight number'),
    mainFlight: z
      .string()
      .nullable()
      .optional()
      .describe('Operating airline flight name for codeshares'),
    flightDirection: FlightDirectionSchema,
    prefixIata: z.string().nullable().optional().describe('2-letter airline IATA prefix'),
    prefixIcao: z.string().nullable().optional().describe('3-letter airline ICAO prefix'),
    airlineCode: z.number().nullable().optional().describe('Numeric NVLS airline code'),
    isOperationalFlight: z.boolean().default(true).describe('Whether this flight is operational'),
    serviceType: z
      .string()
      .nullable()
      .optional()
      .describe('Commercial service type code (J, C, F, H)'),
    originCode: z.string().nullable().optional().describe('Origin airport IATA code'),
    destinationCode: z.string().nullable().optional().describe('Destination airport IATA code'),
    routeDestinations: z
      .array(z.string())
      .default([])
      .describe('Airport IATA codes along the route'),
    routeEu: z
      .string()
      .nullable()
      .optional()
      .describe('Route region: S (Schengen), E (Europe), N (Non-Europe)'),
    routeVisa: z.boolean().nullable().optional().describe('Whether a visa is required'),
    aircraftRegistration: z
      .string()
      .nullable()
      .optional()
      .describe('Aircraft tail registration (e.g. PHNXD)'),
    aircraftIataMain: z.string().nullable().optional().describe('IATA main aircraft type code'),
    aircraftIataSub: z.string().nullable().optional().describe('IATA aircraft subtype code'),
    scheduleDate: z
      .string()
      .nullable()
      .optional()
      .describe('Scheduled operating date (YYYY-MM-DD)'),
    scheduleTime: z.string().nullable().optional().describe('Scheduled local time (HH:mm:ss)'),
    scheduleDateTime: z
      .string()
      .nullable()
      .optional()
      .describe('Scheduled departure or arrival timestamp'),
    estimatedLandingTime: z
      .string()
      .nullable()
      .optional()
      .describe('Estimated landing time for arrivals'),
    actualLandingTime: z
      .string()
      .nullable()
      .optional()
      .describe('Actual landing time for arrivals'),
    publicEstimatedOffBlockTime: z
      .string()
      .nullable()
      .optional()
      .describe('Estimated departure time for departures'),
    actualOffBlockTime: z
      .string()
      .nullable()
      .optional()
      .describe('Actual off-block time for departures'),
    expectedTimeGateOpen: z.string().nullable().optional().describe('Expected gate open time'),
    expectedTimeBoarding: z.string().nullable().optional().describe('Expected boarding time'),
    expectedTimeGateClosing: z
      .string()
      .nullable()
      .optional()
      .describe('Expected gate closing time'),
    expectedTimeOnBelt: z.string().nullable().optional().describe('Expected baggage on belt time'),
    expectedSecurityFilter: z.string().nullable().optional().describe('Expected security filter'),
    lastUpdatedAt: z.string().nullable().optional().describe('Last update timestamp'),
    terminal: z.number().nullable().optional().describe('Schiphol terminal number'),
    pier: z.string().nullable().optional().describe('Schiphol pier letter'),
    gate: z.string().nullable().optional().describe('Departure or arrival gate'),
    flightStates: z
      .array(z.string())
      .default([])
      .describe('Public flight status codes (e.g. GTD, BRD, AIR)'),
    codeshares: z.array(z.string()).default([]).describe('Codeshare flight numbers'),
    baggageBelts: z.array(z.string()).default([]).describe('Baggage reclaim belts'),
    transferPositions: z.array(z.number()).default([]).describe('Transfer desk positions'),
    checkinRows: z.array(z.string()).default([]).describe('Summary list of check-in row numbers'),
    checkinStartTime: z.string().nullable().optional().describe('Earliest check-in start time'),
    checkinEndTime: z.string().nullable().optional().describe('Latest check-in end time'),
    checkinAllocations: z
      .array(CheckinAllocationSchema)
      .default([])
      .describe('Detailed check-in allocations'),
  })
  .describe('Scheduled inbound or outbound Schiphol flight');

export const ScheduleSyncRequestSchema = z.object({
  scheduleDate: z.string().nullable().optional(),
  direction: FlightDirectionSchema.nullable().optional(),
  includeDelays: z.boolean().default(false),
  maxPages: z.number().int().min(1).max(500).default(500),
});

export const ScheduleSyncResultSchema = z.object({
  scheduleDate: z.string(),
  syncedCount: z.number(),
  pagesFetched: z.number(),
});

export type FlightDirection = z.infer<typeof FlightDirectionSchema>;
export type CheckinDesk = z.infer<typeof CheckinDeskSchema>;
export type CheckinRow = z.infer<typeof CheckinRowSchema>;
export type CheckinAllocation = z.infer<typeof CheckinAllocationSchema>;
export type ScheduledFlight = z.infer<typeof ScheduledFlightSchema>;
export type ScheduleSyncRequest = z.infer<typeof ScheduleSyncRequestSchema>;
export type ScheduleSyncResult = z.infer<typeof ScheduleSyncResultSchema>;

export const SCHEDULED_FLIGHT_JSON_SCHEMA = z.toJSONSchema(ScheduledFlightSchema);

export type TurnaroundSortBy = 'arrival' | 'departure';

export interface TurnaroundPair {
  key: string;
  aircraftRegistration: string;
  aircraftType: string;
  gate: string | null;
  pier: string | null;
  terminal: number | null;
  arrival: ScheduledFlight | null;
  departure: ScheduledFlight | null;
  groundMinutes: number | null;
  hasDeparted: boolean;
  sortTimeMs: number;
}

export function isFlightDeparted(flight: ScheduledFlight | null | undefined): boolean {
  if (!flight || flight.flightDirection !== 'D') return false;
  return (
    flight.actualOffBlockTime != null ||
    flight.flightStates.some((state) => state.toUpperCase() === 'DEP')
  );
}

/**
 * Returns the primary arrival or departure timestamp used for sorting and display.
 */
export function primaryEventIso(flight: ScheduledFlight): string | null {
  if (flight.flightDirection === 'A') {
    return (
      flight.estimatedLandingTime ?? flight.actualLandingTime ?? flight.scheduleDateTime ?? null
    );
  }
  return (
    flight.publicEstimatedOffBlockTime ??
    flight.actualOffBlockTime ??
    flight.scheduleDateTime ??
    null
  );
}

export function scheduledSortMs(flight: ScheduledFlight): number {
  const iso = flight.scheduleDateTime ?? primaryEventIso(flight);
  if (!iso) return Number.MAX_SAFE_INTEGER;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
}

export function formatTime(iso: string | null | undefined, fallback?: string | null): string {
  if (iso) {
    const date = new Date(iso);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    }
  }
  if (fallback) return fallback.slice(0, 5);
  return '—';
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString([], {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatRoute(flight: ScheduledFlight): string {
  return `${flight.originCode ?? '—'} → ${flight.destinationCode ?? '—'}`;
}

export function formatAircraftType(flight: ScheduledFlight): string {
  const parts = [flight.aircraftIataMain, flight.aircraftIataSub].filter(Boolean);
  return parts.length ? parts.join(' / ') : '—';
}

export function buildTurnaroundPairs(
  flights: ScheduledFlight[],
  sortBy: TurnaroundSortBy = 'arrival',
  showDeparted = false,
): TurnaroundPair[] {
  const byRegistration = new Map<string, ScheduledFlight[]>();

  for (const flight of flights) {
    const reg = flight.aircraftRegistration?.trim().toUpperCase();
    if (!reg) continue;
    const list = byRegistration.get(reg) ?? [];
    list.push(flight);
    byRegistration.set(reg, list);
  }

  const pairs: TurnaroundPair[] = [];

  for (const [reg, regFlights] of byRegistration.entries()) {
    // Deduplicate codeshares per physical movement (prefer main operating flight)
    const uniqueMovements = new Map<string, ScheduledFlight>();
    for (const flight of regFlights) {
      const movementKey = `${flight.flightDirection}|${flight.scheduleDateTime ?? flight.scheduleTime ?? flight.id}`;
      const existing = uniqueMovements.get(movementKey);
      const isMain = !flight.mainFlight || flight.flightName === flight.mainFlight;
      if (!existing || isMain) {
        uniqueMovements.set(movementKey, flight);
      }
    }

    const arrivals = [...uniqueMovements.values()]
      .filter((f) => f.flightDirection === 'A')
      .sort((a, b) => scheduledSortMs(a) - scheduledSortMs(b));
    const departures = [...uniqueMovements.values()]
      .filter((f) => f.flightDirection === 'D')
      .sort((a, b) => scheduledSortMs(a) - scheduledSortMs(b));

    const usedDepartures = new Set<string>();

    for (const arrival of arrivals) {
      const arrMs = scheduledSortMs(arrival);
      const matchedDeparture =
        departures.find((dep) => !usedDepartures.has(dep.id) && scheduledSortMs(dep) >= arrMs) ??
        null;

      if (matchedDeparture) {
        usedDepartures.add(matchedDeparture.id);
      }

      const depMs = matchedDeparture ? scheduledSortMs(matchedDeparture) : null;
      const groundMinutes =
        depMs != null && arrMs < Number.MAX_SAFE_INTEGER && depMs < Number.MAX_SAFE_INTEGER
          ? Math.round((depMs - arrMs) / 60_000)
          : null;
      const departed = isFlightDeparted(matchedDeparture);

      pairs.push({
        key: `${reg}-${arrival.id}-${matchedDeparture?.id ?? 'none'}`,
        aircraftRegistration: reg,
        aircraftType: formatAircraftType(matchedDeparture ?? arrival),
        gate: matchedDeparture?.gate ?? arrival.gate ?? null,
        pier: matchedDeparture?.pier ?? arrival.pier ?? null,
        terminal: matchedDeparture?.terminal ?? arrival.terminal ?? null,
        arrival,
        departure: matchedDeparture,
        groundMinutes,
        hasDeparted: departed,
        sortTimeMs: sortBy === 'departure' ? (depMs ?? arrMs) : arrMs,
      });
    }

    for (const departure of departures) {
      if (usedDepartures.has(departure.id)) continue;
      const depMs = scheduledSortMs(departure);
      pairs.push({
        key: `${reg}-none-${departure.id}`,
        aircraftRegistration: reg,
        aircraftType: formatAircraftType(departure),
        gate: departure.gate ?? null,
        pier: departure.pier ?? null,
        terminal: departure.terminal ?? null,
        arrival: null,
        departure,
        groundMinutes: null,
        hasDeparted: isFlightDeparted(departure),
        sortTimeMs: depMs,
      });
    }
  }

  return pairs
    .filter((pair) => showDeparted || !pair.hasDeparted)
    .sort((a, b) => a.sortTimeMs - b.sortTimeMs);
}
