import { z } from 'zod';
import { StationSchema } from '../../stations/models/station.model';
import { CALLSIGN_OVERRIDES, CALLSIGN_PREFIX_ALIASES } from '../config/callsign-mapping.config';
import { ScheduledFlight } from './schedule.model';

export const StateVectorSchema = z
  .object({
    icao24: z.string(),
    callsign: z.string().nullable().optional(),
    originCountry: z.string().nullable().optional(),
    timePosition: z.number().nullable().optional(),
    lastContact: z.number().nullable().optional(),
    longitude: z.number().nullable().optional(),
    latitude: z.number().nullable().optional(),
    baroAltitude: z.number().nullable().optional(),
    onGround: z.boolean().default(false),
    velocity: z.number().nullable().optional(),
    trueTrack: z.number().nullable().optional(),
    verticalRate: z.number().nullable().optional(),
    geoAltitude: z.number().nullable().optional(),
    squawk: z.string().nullable().optional(),
    spi: z.boolean().default(false),
    positionSource: z.number().nullable().optional(),
  })
  .describe('Live aircraft state vector from OpenSky /states/all');

export const AirportFlightSchema = z
  .object({
    icao24: z.string(),
    callsign: z.string().nullable().optional(),
    firstSeen: z.number().nullable().optional(),
    lastSeen: z.number().nullable().optional(),
    estDepartureAirport: z.string().nullable().optional(),
    estArrivalAirport: z.string().nullable().optional(),
  })
  .describe(
    'Airport arrival or departure flight from OpenSky /flights/arrival or /flights/departure',
  );

export const TrackWaypointSchema = z
  .object({
    time: z.number(),
    latitude: z.number(),
    longitude: z.number(),
    baroAltitude: z.number().nullable().optional(),
    trueTrack: z.number().nullable().optional(),
    onGround: z.boolean().default(false),
  })
  .describe('Single OpenSky flight track waypoint');

export const EnrichedFlightTrackSchema = z
  .object({
    icao24: z.string(),
    callsign: z.string().nullable().optional(),
    path: z.array(TrackWaypointSchema).default([]),
    fromStation: StationSchema.nullable().optional(),
    toStation: StationSchema.nullable().optional(),
    remainingPath: z.array(z.array(z.number())).default([]),
  })
  .describe('Enriched OpenSky flight track with stations and remaining leg');

export type StateVector = z.infer<typeof StateVectorSchema>;
export type AirportFlight = z.infer<typeof AirportFlightSchema>;
export type TrackWaypoint = z.infer<typeof TrackWaypointSchema>;
export type EnrichedFlightTrack = z.infer<typeof EnrichedFlightTrackSchema>;

export interface LiveFlightState {
  state: StateVector;
  arrival: AirportFlight | null;
  departure: AirportFlight | null;
  schedule: ScheduledFlight | null;
  direction: 'A' | 'D' | null;
  originCode: string | null;
  destinationCode: string | null;
  displayCallsign: string;
}

export interface ScheduleCallsignIndex {
  byFlightName: Map<string, ScheduledFlight>;
  byIcaoNumber: Map<string, ScheduledFlight>;
}

/**
 * Strips leading zeros from the numeric portion of a flight code (e.g. `KL0891` -> `KL891`).
 */
function stripLeadingZeros(code: string): string {
  return code.replace(/^([A-Z]{3}|[A-Z0-9]{2})0+([1-9][0-9]*[A-Z]*)$/, '$1$2');
}

/**
 * Builds an index for linking OpenSky callsigns to Schiphol scheduled flights:
 * 1. Primary lookup by `flightName` (and `codeshares`), including zero-stripped variants
 * 2. Fallback lookup by `${prefixIcao}${flightNumber}` (e.g. `KLM1051`)
 */
export function buildScheduleCallsignIndex(flights: ScheduledFlight[]): ScheduleCallsignIndex {
  const byFlightName = new Map<string, ScheduledFlight>();
  const byIcaoNumber = new Map<string, ScheduledFlight>();

  const registerName = (name: string, flight: ScheduledFlight, preferOverwrite: boolean): void => {
    if (!name) return;
    if (preferOverwrite || !byFlightName.has(name)) {
      byFlightName.set(name, flight);
    }
    const stripped = stripLeadingZeros(name);
    if (stripped !== name && (preferOverwrite || !byFlightName.has(stripped))) {
      byFlightName.set(stripped, flight);
    }
  };

  for (const flight of flights) {
    const isMain = !flight.mainFlight || flight.flightName === flight.mainFlight;

    registerName(flight.flightName.trim().toUpperCase(), flight, isMain);

    for (const codeshare of flight.codeshares) {
      registerName(codeshare.trim().toUpperCase(), flight, false);
    }

    if (flight.prefixIcao && flight.flightNumber != null) {
      const icaoCallsign = `${flight.prefixIcao.trim()}${flight.flightNumber}`.toUpperCase();
      if (isMain || !byIcaoNumber.has(icaoCallsign)) {
        byIcaoNumber.set(icaoCallsign, flight);
      }
    }
  }

  return { byFlightName, byIcaoNumber };
}

function lookupDirect(code: string, index: ScheduleCallsignIndex): ScheduledFlight | null {
  return index.byFlightName.get(code) ?? index.byIcaoNumber.get(code) ?? null;
}

/**
 * Resolves an OpenSky ATC callsign to a Schiphol scheduled flight using:
 * 1. Direct match (`flightName`, `codeshares`, `${prefixIcao}${flightNumber}`)
 * 2. Explicit `CALLSIGN_OVERRIDES` configuration
 * 3. Leading-zero / trailing-letter normalization & `CALLSIGN_PREFIX_ALIASES` (e.g. `KLC1051` -> `KL1051`)
 */
export function findLinkedSchedule(
  rawCallsign: string | null | undefined,
  index: ScheduleCallsignIndex,
  overrides: Readonly<Record<string, string>> = CALLSIGN_OVERRIDES,
  prefixAliases: Readonly<Record<string, readonly string[]>> = CALLSIGN_PREFIX_ALIASES,
): ScheduledFlight | null {
  const normalized = rawCallsign?.trim().toUpperCase();
  if (!normalized) return null;

  const direct = lookupDirect(normalized, index);
  if (direct) return direct;

  const override = overrides[normalized]?.trim().toUpperCase();
  if (override) {
    const overrideMatch = lookupDirect(override, index);
    if (overrideMatch) return overrideMatch;
  }

  const parsed = /^([A-Z]{3})0*([1-9][0-9]*)([A-Z]*)$/.exec(normalized);
  if (!parsed) return null;

  const [, prefix, number] = parsed;

  // Try stripped numeric form (handles leading zeros like KLM0428 and trailing letters like BAW428A)
  const canonicalIcao = `${prefix}${number}`;
  if (canonicalIcao !== normalized) {
    const canonicalMatch = lookupDirect(canonicalIcao, index);
    if (canonicalMatch) return canonicalMatch;
  }

  // Try operating -> marketing carrier prefix aliases (e.g. KLC -> KLM/KL, EJU -> EZY/U2)
  for (const alias of prefixAliases[prefix] ?? []) {
    const aliasMatch = lookupDirect(`${alias.toUpperCase()}${number}`, index);
    if (aliasMatch) return aliasMatch;
  }

  return null;
}

export interface ScheduleRouteMatchContext {
  callsign: string;
  direction: 'A' | 'D';
  /** Partner airport IATA code (origin for arrivals, destination for departures). */
  partnerAirportIata: string | null;
  /** Reference OpenSky timestamp in Unix epoch seconds (`firstSeen` for D, `lastSeen` for A). */
  referenceEpochSeconds: number | null;
}

const MAX_ROUTE_MATCH_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours
const MIN_DISAMBIGUATION_GAP_MS = 15 * 60 * 1000; // 15 minutes

function scheduleEventMs(flight: ScheduledFlight): number | null {
  const iso =
    flight.flightDirection === 'D'
      ? (flight.actualOffBlockTime ?? flight.publicEstimatedOffBlockTime ?? flight.scheduleDateTime)
      : (flight.actualLandingTime ?? flight.estimatedLandingTime ?? flight.scheduleDateTime);
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Best-effort fallback for ATC deconflicted callsigns (e.g. `KLM163` -> `KL735`) that cannot be
 * matched by callsign string alone. Matches by airline prefix, direction, partner airport (IATA),
 * and closest departure/arrival timestamp within a bounded window.
 */
export function findScheduleByRouteAndTime(
  flights: ScheduledFlight[],
  context: ScheduleRouteMatchContext,
  prefixAliases: Readonly<Record<string, readonly string[]>> = CALLSIGN_PREFIX_ALIASES,
): ScheduledFlight | null {
  const partnerIata = context.partnerAirportIata?.trim().toUpperCase();
  if (!partnerIata) return null;

  const prefixMatch = /^([A-Z]{3})/.exec(context.callsign.trim().toUpperCase());
  if (!prefixMatch) return null;

  const icaoPrefix = prefixMatch[1];
  const airlineCodes = new Set<string>([
    icaoPrefix,
    ...(prefixAliases[icaoPrefix] ?? []).map((code) => code.toUpperCase()),
  ]);

  const candidates = flights.filter((flight) => {
    if (flight.flightDirection !== context.direction) return false;
    const isMain = !flight.mainFlight || flight.flightName === flight.mainFlight;
    if (!isMain) return false;

    const matchesAirline =
      (flight.prefixIcao != null && airlineCodes.has(flight.prefixIcao.trim().toUpperCase())) ||
      (flight.prefixIata != null && airlineCodes.has(flight.prefixIata.trim().toUpperCase()));
    if (!matchesAirline) return false;

    const flightPartner =
      context.direction === 'D'
        ? flight.destinationCode?.trim().toUpperCase()
        : flight.originCode?.trim().toUpperCase();
    return flightPartner === partnerIata;
  });

  if (candidates.length === 0) return null;

  const refMs = context.referenceEpochSeconds != null ? context.referenceEpochSeconds * 1000 : null;

  if (candidates.length === 1) {
    const only = candidates[0];
    if (refMs == null) return only;
    const eventMs = scheduleEventMs(only);
    if (eventMs == null || Math.abs(eventMs - refMs) <= MAX_ROUTE_MATCH_WINDOW_MS) {
      return only;
    }
    return null;
  }

  if (refMs == null) return null;

  const scored = candidates
    .map((flight) => {
      const eventMs = scheduleEventMs(flight);
      return eventMs == null ? null : { flight, diffMs: Math.abs(eventMs - refMs) };
    })
    .filter((entry): entry is { flight: ScheduledFlight; diffMs: number } => entry !== null)
    .sort((a, b) => a.diffMs - b.diffMs);

  if (scored.length === 0 || scored[0].diffMs > MAX_ROUTE_MATCH_WINDOW_MS) {
    return null;
  }
  if (scored.length > 1 && scored[1].diffMs - scored[0].diffMs < MIN_DISAMBIGUATION_GAP_MS) {
    return null;
  }

  return scored[0].flight;
}

export function formatEpochTime(epochSeconds: number | null | undefined): string {
  if (epochSeconds == null) return '—';
  const date = new Date(epochSeconds * 1000);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatAltitudeMeters(meters: number | null | undefined): string {
  if (meters == null) return '—';
  const feet = Math.round(meters * 3.28084);
  return `${Math.round(meters).toLocaleString()} m (${feet.toLocaleString()} ft)`;
}

export function formatSpeedMps(mps: number | null | undefined): string {
  if (mps == null) return '—';
  const knots = Math.round(mps * 1.94384);
  return `${knots} kt (${Math.round(mps * 3.6)} km/h)`;
}
