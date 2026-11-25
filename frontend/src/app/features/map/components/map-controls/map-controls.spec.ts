import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MapStore } from '../../store/map.store';
import { MapControls } from './map-controls';

describe('MapControls', () => {
  let component: MapControls;
  let fixture: ComponentFixture<MapControls>;
  let store: InstanceType<typeof MapStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapControls],
    }).compileComponents();

    store = TestBed.inject(MapStore);
    fixture = TestBed.createComponent(MapControls);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('switches projection and toggles/reorders layers through MapStore', () => {
    expect(store.projection()).toBe('mercator');
    component.setProjection('globe');
    expect(store.projection()).toBe('globe');

    expect(store.layerVisibility()['flight-paths']).toBe(false);
    expect(store.layerOrder()).toEqual(['day-night', 'flight-paths', 'stations', 'flight-states']);
    component.moveLayer('day-night', 'up', new Event('click'));
    expect(store.layerOrder()).toEqual(['flight-paths', 'day-night', 'stations', 'flight-states']);

    component.toggleLayer('day-night', false);
    expect(store.layerVisibility()['day-night']).toBe(false);
  });
});
