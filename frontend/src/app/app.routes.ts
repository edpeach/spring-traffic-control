import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'stations' },
  {
    path: 'stations',
    loadComponent: () =>
      import('./features/stations/pages/stations-page/stations-page').then((m) => m.StationsPage),
  },
  {
    path: 'stations/:code',
    loadComponent: () =>
      import('./features/stations/pages/station-detail-page/station-detail-page').then(
        (m) => m.StationDetailPage,
      ),
  },
  {
    path: 'flights',
    loadComponent: () =>
      import('./features/flights/pages/flights-page/flights-page').then((m) => m.FlightsPage),
  },
  {
    path: 'flights/:flightName',
    loadComponent: () =>
      import('./features/flights/pages/flight-detail-page/flight-detail-page').then(
        (m) => m.FlightDetailPage,
      ),
  },
  {
    path: 'map',
    loadComponent: () => import('./features/map/pages/map-page/map-page').then((m) => m.MapPage),
  },
  {
    path: 'agent',
    loadComponent: () =>
      import('./features/agent/pages/agent-page/agent-page').then((m) => m.AgentPage),
  },
];
