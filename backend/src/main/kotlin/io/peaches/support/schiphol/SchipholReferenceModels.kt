package io.peaches.support.schiphol

/**
 * Wrapper returned by `GET /airlines`.
 */
data class SchipholAirlineList(
  val airlines: List<SchipholAirline> = emptyList(),
)

/**
 * Passenger airline operating to or from Amsterdam Airport Schiphol.
 */
data class SchipholAirline(
  val iata: String? = null,
  val icao: String? = null,
  val nvls: Long? = null,
  val publicName: String? = null,
)

/**
 * Wrapper returned by `GET /aircrafttypes`.
 */
data class SchipholAircraftTypeList(
  val aircraftTypes: List<SchipholAircraftType> = emptyList(),
)

/**
 * Aircraft type operated on flights to or from Amsterdam Airport Schiphol.
 */
data class SchipholAircraftType(
  val iataMain: String? = null,
  val iataSub: String? = null,
  val longDescription: String? = null,
  val shortDescription: String? = null,
)

/**
 * Wrapper returned by `GET /destinations`.
 */
data class SchipholDestinationList(
  val destinations: List<SchipholDestination> = emptyList(),
)

/**
 * Destination served by flights to or from Amsterdam Airport Schiphol.
 */
data class SchipholDestination(
  val iata: String? = null,
  val city: String? = null,
  val country: String? = null,
  val publicName: SchipholPublicName? = null,
)

/**
 * Localized public names of a destination.
 */
data class SchipholPublicName(
  val dutch: String? = null,
  val english: String? = null,
)
