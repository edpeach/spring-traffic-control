import { Component, input, output } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { NearestStation, Station, stationRouteCode } from '../../../stations/models/station.model';

@Component({
  selector: 'app-nearest-airports-card',
  imports: [MatIcon],
  templateUrl: './nearest-airports-card.html',
  styleUrl: './nearest-airports-card.css',
})
export class NearestAirportsCard {
  readonly airports = input.required<NearestStation[]>();
  readonly icao24 = input<string | null>(null);
  readonly emergencyOnly = input(false);
  readonly selectStation = output<Station>();

  protected routeCode(station: Station): string {
    return stationRouteCode(station);
  }
}
