import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton, MatIconButton } from '@angular/material/button';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatChip, MatChipSet } from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { ActivatedRoute, Router } from '@angular/router';
import { Map as MapLibreMap, MapMouseEvent, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import { map as rxMap } from 'rxjs';
import { Theme } from '../../../../core/services/theme';
import { NearestAirportsCard } from '../../../agent/components/nearest-airports-card/nearest-airports-card';
import { FlightCard } from '../../../flights/components/flight-card/flight-card';
import {
  formatAltitudeMeters,
  formatEpochTime,
  formatSpeedMps,
} from '../../../flights/models/flight-state.model';
import { ScheduledFlight } from '../../../flights/models/schedule.model';
import { FlightState } from '../../../flights/services/flight-state';
import { Schedule } from '../../../flights/services/schedule';
import { ScheduleStore } from '../../../flights/store/schedule.store';
import { StationCard } from '../../../stations/components/station-card/station-card';
import { Station, stationRouteCode } from '../../../stations/models/station.model';
import { Stations } from '../../../stations/services/stations';
import { StationStore } from '../../../stations/store/station.store';
import { MapControls } from '../../components/map-controls/map-controls';
import { MAP_CONFIG, MapLayerId } from '../../config/map.config';
import { DAY_NIGHT_LAYER_CONFIG } from '../../layers/day-night/day-night.config';
import { DayNightLayer } from '../../layers/day-night/day-night.layer';
import { DayNightLayerStore } from '../../layers/day-night/day-night.store';
import { FLIGHT_PATHS_LAYER_CONFIG } from '../../layers/flight-paths/flight-paths.config';
import { FlightPathsLayer } from '../../layers/flight-paths/flight-paths.layer';
import { FlightPathsLayerStore } from '../../layers/flight-paths/flight-paths.store';
import { FLIGHT_STATES_LAYER_CONFIG } from '../../layers/flight-states/flight-states.config';
import { FlightStatesLayer } from '../../layers/flight-states/flight-states.layer';
import { FlightStatesLayerStore } from '../../layers/flight-states/flight-states.store';
import { FlightTrackLayer } from '../../layers/flight-track/flight-track.layer';
import { FlightTrackLayerStore } from '../../layers/flight-track/flight-track.store';
import { MapLayerAdapter } from '../../layers/map-layer';
import { STATIONS_LAYER_CONFIG } from '../../layers/stations/stations.config';
import { StationsLayer } from '../../layers/stations/stations.layer';
import { StationsLayerStore } from '../../layers/stations/stations.store';
import { MapStore } from '../../store/map.store';

@Component({
  selector: 'app-map-page',
  imports: [
    MatSidenavContainer,
    MatSidenav,
    MatSidenavContent,
    MatButton,
    MatIconButton,
    MatIcon,
    MatCard,
    MatCardHeader,
    MatCardTitle,
    MatCardSubtitle,
    MatCardContent,
    MatChipSet,
    MatChip,
    MapControls,
    StationCard,
    FlightCard,
    NearestAirportsCard,
  ],
  templateUrl: './map-page.html',
  styleUrl: './map-page.css',
})
export class MapPage implements OnInit {
  readonly mapStore = inject(MapStore);
  readonly stationsLayerStore = inject(StationsLayerStore);
  readonly flightPathsLayerStore = inject(FlightPathsLayerStore);
  readonly flightStatesLayerStore = inject(FlightStatesLayerStore);
  readonly flightTrackLayerStore = inject(FlightTrackLayerStore);
  private readonly dayNightStore = inject(DayNightLayerStore);
  readonly stationStore = inject(StationStore);
  private readonly scheduleStore = inject(ScheduleStore);
  private readonly stationsService = inject(Stations);
  private readonly scheduleService = inject(Schedule);
  private readonly flightStateService = inject(FlightState);
  private readonly dayNightLayer = inject(DayNightLayer);
  private readonly flightPathsLayer = inject(FlightPathsLayer);
  private readonly stationsLayer = inject(StationsLayer);
  private readonly flightStatesLayer = inject(FlightStatesLayer);
  private readonly flightTrackLayer = inject(FlightTrackLayer);
  private readonly theme = inject(Theme);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly formatAltitudeMeters = formatAltitudeMeters;
  readonly formatSpeedMps = formatSpeedMps;
  readonly formatEpochTime = formatEpochTime;

  private readonly mapContainer = viewChild<ElementRef<HTMLElement>>('mapContainer');
  private readonly mapInstance = signal<MapLibreMap | null>(null);
  private readonly styleReady = signal(false);
  private appliedDarkMode: boolean | null = null;
  private lastFlightCameraKey: string | null = null;

  private readonly layerAdapters: Record<MapLayerId, MapLayerAdapter> = {
    'day-night': this.dayNightLayer,
    'flight-paths': this.flightPathsLayer,
    stations: this.stationsLayer,
    'flight-track': this.flightTrackLayer,
    'flight-states': this.flightStatesLayer,
  };

  readonly queryStationCode = toSignal(
    this.route.queryParamMap.pipe(rxMap((params) => params.get('station'))),
    { initialValue: null },
  );

  readonly selectedFlightState = computed(() => this.flightStatesLayerStore.selectedFlight());
  readonly selectedFlight = computed(() =>
    this.selectedFlightState() ? null : this.flightPathsLayerStore.selectedFlight(),
  );
  readonly selectedStation = computed(() =>
    this.selectedFlightState() || this.selectedFlight()
      ? null
      : this.stationsLayerStore.selectedStation(),
  );
  readonly selectedStations = computed<Station[]>(() => {
    if (this.selectedFlightState() || this.selectedFlight()) {
      return [];
    }
    const byId = new Map<string, Station>();
    const primary = this.stationsLayerStore.selectedStation();
    if (primary) {
      byId.set(primary.id, primary);
    }
    const highlighted = this.stationsLayerStore.highlightedCodes();
    if (highlighted.length > 0) {
      const allStations = this.stationStore.stations();
      for (const rawCode of highlighted) {
        const normalized = rawCode.trim().toUpperCase();
        if (!normalized) continue;
        const match = allStations.find(
          (s) =>
            s.icao?.toUpperCase() === normalized ||
            s.iata?.toUpperCase() === normalized ||
            s.id.toUpperCase() === normalized,
        );
        if (match && !byId.has(match.id)) {
          byId.set(match.id, match);
        }
      }
    }
    return Array.from(byId.values());
  });

  constructor() {
    afterNextRender(() => this.initMap());

    // Sync ?station=<code> query parameter into stores (supports Show on map & deep links)
    effect(() => {
      const code = this.queryStationCode();
      if (code) {
        this.stationsLayerStore.selectStation(code);
        this.mapStore.selectStation(code);
      }
    });

    // Fly camera when a station with coordinates is selected
    effect(() => {
      const station = this.selectedStation();
      if (station && station.latitude != null && station.longitude != null) {
        this.mapStore.flyTo({
          longitude: station.longitude,
          latitude: station.latitude,
          zoom: MAP_CONFIG.selectionZoom,
        });
      }
    });

    // Zoom and scale camera when a live flight (and optional closest airports) is selected
    effect(() => {
      const flight = this.selectedFlightState();
      const closest = this.mapStore.closestAirports();
      if (!flight || flight.state.latitude == null || flight.state.longitude == null) {
        this.lastFlightCameraKey = null;
        return;
      }

      const closestCodes = closest.map((entry) => stationRouteCode(entry.station)).join(',');
      const cameraKey = `${flight.state.icao24}|${closestCodes}`;
      if (this.lastFlightCameraKey === cameraKey) return;
      this.lastFlightCameraKey = cameraKey;

      const points: [number, number][] = [[flight.state.longitude, flight.state.latitude]];
      for (const entry of closest) {
        if (entry.station.longitude != null && entry.station.latitude != null) {
          points.push([entry.station.longitude, entry.station.latitude]);
        }
      }

      const bounds = this.computeBounds(points);
      if (bounds) {
        this.mapStore.fitBounds({
          ...bounds,
          maxZoom: MAP_CONFIG.selectionZoom,
        });
      } else {
        this.mapStore.flyTo({
          longitude: flight.state.longitude,
          latitude: flight.state.latitude,
          zoom: MAP_CONFIG.flightSelectionZoom,
        });
      }
    });

    // Zoom and scale camera when a scheduled flight path is selected
    effect(() => {
      const flight = this.selectedFlight();
      if (!flight) return;

      const stations = this.stationStore.stations();
      const codes = [flight.originCode, flight.destinationCode]
        .filter((c): c is string => Boolean(c))
        .map((c) => c.trim().toUpperCase());

      const points: [number, number][] = [];
      for (const code of codes) {
        const match = stations.find(
          (s) => s.iata?.toUpperCase() === code || s.icao?.toUpperCase() === code,
        );
        if (match?.longitude != null && match.latitude != null) {
          points.push([match.longitude, match.latitude]);
        }
      }

      const bounds = this.computeBounds(points);
      if (bounds) {
        this.mapStore.fitBounds({
          ...bounds,
          maxZoom: MAP_CONFIG.selectionZoom,
        });
      } else if (points.length === 1) {
        this.mapStore.flyTo({
          longitude: points[0][0],
          latitude: points[0][1],
          zoom: MAP_CONFIG.flightSelectionZoom,
        });
      }
    });

    // Switch basemap style when app dark/light mode changes
    effect(() => {
      const isDark = this.theme.isDark();
      const map = this.mapInstance();
      if (!map || this.appliedDarkMode === isDark) return;
      this.appliedDarkMode = isDark;
      this.styleReady.set(false);
      map.setStyle(isDark ? MAP_CONFIG.styles.dark : MAP_CONFIG.styles.light);
    });

    // Sync projection (mercator / globe)
    effect(() => {
      const map = this.mapInstance();
      const ready = this.styleReady();
      const projection = this.mapStore.projection();
      if (!map || !ready) return;
      map.setProjection({ type: projection });
    });

    // Sync dynamic layer attachment/detachment, visibility, and z-order
    effect(() => {
      const map = this.mapInstance();
      const ready = this.styleReady();
      const layers = this.mapStore.layers();
      if (!map || !ready) return;

      const activeIds = new Set(layers.map((l) => l.id));
      for (const [id, adapter] of Object.entries(this.layerAdapters) as [
        MapLayerId,
        MapLayerAdapter,
      ][]) {
        if (!activeIds.has(id)) {
          adapter.detach(map);
        }
      }

      for (const layer of layers) {
        const adapter = this.layerAdapters[layer.id];
        adapter.attach(map);
        adapter.setVisible(map, layer.visible);
        for (const mlId of adapter.mapLayerIds) {
          if (map.getLayer(mlId)) {
            map.moveLayer(mlId);
          }
        }
      }
    });

    // Sync day/night GeoJSON data
    effect(() => {
      const map = this.mapInstance();
      const ready = this.styleReady();
      this.dayNightStore.nightGeoJson();
      if (!map || !ready) return;
      this.dayNightLayer.sync(map);
    });

    // Sync stations GeoJSON data and highlight state
    effect(() => {
      const map = this.mapInstance();
      const ready = this.styleReady();
      this.stationsLayerStore.geoJson();
      if (!map || !ready) return;
      this.stationsLayer.sync(map);
    });

    // Sync curved flight paths GeoJSON data
    effect(() => {
      const map = this.mapInstance();
      const ready = this.styleReady();
      this.flightPathsLayerStore.geoJson();
      if (!map || !ready) return;
      this.flightPathsLayer.sync(map);
    });

    // Sync live OpenSky flight states GeoJSON data (with selection highlight & dimming)
    effect(() => {
      const map = this.mapInstance();
      const ready = this.styleReady();
      this.flightStatesLayerStore.geoJson();
      if (!map || !ready) return;
      this.flightStatesLayer.sync(map);
    });

    // Sync selected flight track (flown path + remaining leg + paths to closest airports)
    effect(() => {
      const map = this.mapInstance();
      const ready = this.styleReady();
      this.flightTrackLayerStore.flownGeoJson();
      this.flightTrackLayerStore.remainingGeoJson();
      this.flightTrackLayerStore.closestAirportsGeoJson();
      if (!map || !ready) return;
      this.flightTrackLayer.sync(map);
    });

    // Keep layer-level selections mutually exclusive and load/clear selected flight track
    effect(() => {
      const item = this.mapStore.selectedItem();
      const closest = this.mapStore.closestAirports();
      const closestLoading = this.mapStore.closestAirportsLoading();
      if (item?.kind === 'flight-state') {
        if (this.flightTrackLayerStore.activeIcao24() !== item.icao24) {
          this.flightStateService.loadTrack(item.icao24);
        }
      } else {
        this.flightStatesLayerStore.clearSelection();
        this.flightStateService.clearTrack();
        if (closest.length > 0) {
          this.flightStateService.clearNearestAirports();
        }
      }
      if (item?.kind !== 'flight') {
        this.flightPathsLayerStore.clearSelection();
      }
      if (item?.kind !== 'station' && closest.length === 0 && !closestLoading) {
        this.stationsLayerStore.clearHighlights();
      }
    });

    // Sync closest airports into StationsLayerStore highlight codes (both ICAO & IATA)
    effect(() => {
      const closest = this.mapStore.closestAirports();
      if (closest.length > 0) {
        const codes = closest.flatMap((entry) =>
          [stationRouteCode(entry.station), entry.station.icao, entry.station.iata].filter(
            (c): c is string => Boolean(c),
          ),
        );
        this.stationsLayerStore.setHighlightedCodes(codes);
      }
    });

    // Execute camera flyTo requests from UI or AG-UI
    effect(() => {
      const map = this.mapInstance();
      const ready = this.styleReady();
      const target = this.mapStore.cameraTarget();
      if (!map || !ready || !target) return;
      map.flyTo({
        center: [target.longitude, target.latitude],
        zoom: target.zoom ?? MAP_CONFIG.selectionZoom,
        essential: true,
      });
    });

    // Execute camera fitBounds requests from UI or AG-UI
    effect(() => {
      const map = this.mapInstance();
      const ready = this.styleReady();
      const bounds = this.mapStore.cameraBounds();
      if (!map || !ready || !bounds) return;

      const container = this.mapContainer()?.nativeElement;
      const width = container?.clientWidth ?? 1280;
      const height = container?.clientHeight ?? 720;
      const verticalPad = Math.min(80, Math.floor(height * 0.15));
      const sidePad = Math.min(80, Math.floor(width * 0.1));

      map.fitBounds([bounds.sw, bounds.ne], {
        padding: {
          top: verticalPad,
          bottom: verticalPad,
          left: sidePad,
          right: sidePad,
        },
        maxZoom: bounds.maxZoom ?? MAP_CONFIG.selectionZoom,
        duration: 900,
        essential: true,
      });
    });

    const intervalId = setInterval(
      () => this.dayNightStore.refresh(),
      DAY_NIGHT_LAYER_CONFIG.refreshIntervalMs,
    );

    this.destroyRef.onDestroy(() => {
      clearInterval(intervalId);
      const map = this.mapInstance();
      if (map) {
        for (const adapter of Object.values(this.layerAdapters)) {
          adapter.detach(map);
        }
        map.remove();
        this.mapInstance.set(null);
      }
    });
  }

  ngOnInit(): void {
    if (this.stationStore.totalCount() === 0 && !this.stationStore.loading()) {
      this.stationsService.loadAll();
    }
    if (this.scheduleStore.totalCount() === 0 && !this.scheduleStore.loading()) {
      this.scheduleService.loadAll();
    }
    if (
      this.flightStatesLayerStore.states().length === 0 &&
      !this.flightStatesLayerStore.loading()
    ) {
      this.flightStateService.loadAirportTraffic('EHAM');
    }
  }

  closePanel(): void {
    this.mapStore.closePanel();
  }

  clearSelection(): void {
    this.stationsLayerStore.clearHighlights();
    this.flightPathsLayerStore.clearSelection();
    this.flightStatesLayerStore.clearSelection();
    this.flightStateService.clearTrack();
    this.flightStateService.clearNearestAirports();
    this.mapStore.clearSelection();
  }

  toggleClosestAirports(icao24: string): void {
    if (this.mapStore.closestAirports().length > 0) {
      this.flightStateService.clearNearestAirports();
      this.stationsLayerStore.clearHighlights();
    } else {
      this.mapStore.toggleLayer('stations', true);
      this.flightStateService.loadNearestAirports(icao24, 5, false);
    }
  }

  openStationDetail(station: Station): void {
    void this.router.navigate(['/stations', stationRouteCode(station)]);
  }

  openFlightDetail(flight: ScheduledFlight): void {
    void this.router.navigate(['/flights', flight.flightName]);
  }

  centerOnStation(station: Station): void {
    if (station.latitude != null && station.longitude != null) {
      this.mapStore.flyTo({
        longitude: station.longitude,
        latitude: station.latitude,
        zoom: MAP_CONFIG.selectionZoom,
      });
    }
  }

  focusClosestAirport(station: Station): void {
    this.mapStore.focusClosestAirport(stationRouteCode(station));
    this.centerOnStation(station);
  }

  private initMap(): void {
    const container = this.mapContainer()?.nativeElement;
    if (!container || !this.supportsWebGl()) return;

    const isDark = this.theme.isDark();
    this.appliedDarkMode = isDark;

    setWorkerUrl(MAP_CONFIG.workerUrl);

    const map = new MapLibreMap({
      container,
      style: isDark ? MAP_CONFIG.styles.dark : MAP_CONFIG.styles.light,
      center: MAP_CONFIG.defaultCenter,
      zoom: MAP_CONFIG.defaultZoom,
    });

    map.addControl(new NavigationControl(), 'bottom-right');

    map.on('click', (event) => this.handleMapClick(map, event));

    map.on('style.load', () => {
      map.setProjection({ type: this.mapStore.projection() });
      for (const layer of this.mapStore.layers()) {
        const adapter = this.layerAdapters[layer.id];
        adapter.attach(map);
        adapter.setVisible(map, layer.visible);
      }
      map.resize();
      this.styleReady.set(true);
    });

    if (typeof ResizeObserver !== 'undefined') {
      const resizeObserver = new ResizeObserver(() => map.resize());
      resizeObserver.observe(container);
      this.destroyRef.onDestroy(() => resizeObserver.disconnect());
    }

    this.mapInstance.set(map);
  }

  private computeBounds(
    points: [number, number][],
  ): { sw: [number, number]; ne: [number, number] } | null {
    if (points.length < 2) return null;
    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;
    for (const [lon, lat] of points) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
    if (Math.abs(maxLon - minLon) < 1e-4 && Math.abs(maxLat - minLat) < 1e-4) {
      return null;
    }
    return {
      sw: [minLon, minLat],
      ne: [maxLon, maxLat],
    };
  }

  private handleMapClick(map: MapLibreMap, event: MapMouseEvent): void {
    const interactiveLayerIds = [
      STATIONS_LAYER_CONFIG.iconLayerId,
      FLIGHT_PATHS_LAYER_CONFIG.lineLayerId,
      FLIGHT_STATES_LAYER_CONFIG.iconLayerId,
    ].filter((layerId) => Boolean(map.getLayer(layerId)));

    const hits = interactiveLayerIds.length
      ? map.queryRenderedFeatures(event.point, { layers: interactiveLayerIds })
      : [];

    if (hits.length === 0) {
      this.clearSelection();
    }
  }

  private supportsWebGl(): boolean {
    try {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
      return false;
    }
  }
}
