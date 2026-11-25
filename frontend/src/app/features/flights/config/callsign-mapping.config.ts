/**
 * Configuration mapping OpenSky ATC callsigns to Schiphol scheduled flight identifiers.
 *
 * OpenSky broadcasts ADS-B / ATC callsigns (3-letter operating-carrier ICAO prefix +
 * flight number or alphanumeric deconfliction code), whereas Schiphol's schedule uses
 * marketing-carrier IATA/ICAO prefixes and commercial flight numbers.
 */

/**
 * Explicit one-to-one overrides for alphanumeric or non-standard ATC callsigns
 * (e.g. `{ KLM42M: 'KL1051' }`). Keys and values are matched case-insensitively.
 */
export const CALLSIGN_OVERRIDES: Readonly<Record<string, string>> = {};

/**
 * Operating-carrier ICAO callsign prefix -> candidate marketing ICAO/IATA prefixes
 * used in Schiphol schedule data.
 */
export const CALLSIGN_PREFIX_ALIASES: Readonly<Record<string, readonly string[]>> = {
  // KLM & regional / cargo subsidiaries
  KLM: ['KL'],
  KLC: ['KLM', 'KL'],
  MPH: ['MP', 'KLM', 'KL'],

  // Transavia
  TRA: ['HV'],
  TVF: ['TRA', 'TO', 'HV'],

  // easyJet group
  EZY: ['U2'],
  EJU: ['EZY', 'U2', 'EC'],
  EZS: ['EZY', 'U2', 'DS'],

  // British Airways group
  BAW: ['BA'],
  CFE: ['BAW', 'BA'],
  EFW: ['BAW', 'BA'],
  SHT: ['BAW', 'BA'],

  // Lufthansa group
  DLH: ['LH'],
  CLH: ['DLH', 'LH'],
  DLA: ['DLH', 'LH', 'EN'],
  AUA: ['OS'],
  SWR: ['LX'],
  EDW: ['SWR', 'LX', 'WK'],
  BEL: ['SN'],

  // Air France group
  AFR: ['AF'],
  HOP: ['AFR', 'AF'],

  // Ryanair & Wizz Air groups
  RYR: ['FR'],
  RUK: ['RYR', 'FR', 'RK'],
  MAY: ['RYR', 'FR'],
  LDA: ['RYR', 'FR', 'LW'],
  BZY: ['RYR', 'FR'],
  WZZ: ['W6'],
  WMT: ['WZZ', 'W4', 'W6'],
  WUK: ['WZZ', 'W9', 'W6'],

  // Other frequent AMS carriers
  SAS: ['SK'],
  SZS: ['SAS', 'SK'],
  IBE: ['IB'],
  IBS: ['IBE', 'IB', 'I2'],
  ANE: ['IBE', 'IB', 'YW'],
  VLG: ['VY'],
  EIN: ['EI'],
  TAP: ['TP'],
  ITY: ['AZ'],
  TFL: ['OR'],
  CND: ['CD'],
  DAL: ['DL'],
  UAL: ['UA'],
  AAL: ['AA'],
  ACA: ['AC'],
  UAE: ['EK'],
  QTR: ['QR'],
  ETD: ['EY'],
  THY: ['TK'],
};
