import { TestBed } from '@angular/core/testing';
import { Theme } from './theme';

describe('Theme', () => {
  let service: Theme;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Theme);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('supports all four seasonal themes and cycling between them', () => {
    expect(service.themes.map((t) => t.id)).toEqual(['spring', 'summer', 'autumn', 'winter']);
    expect(service.theme()).toBe('spring');
    expect(service.bodyClass()).toBe('theme-spring-dark');

    service.cycleTheme();
    expect(service.theme()).toBe('summer');
    service.cycleTheme();
    expect(service.theme()).toBe('autumn');
    service.cycleTheme();
    expect(service.theme()).toBe('winter');
    service.cycleTheme();
    expect(service.theme()).toBe('spring');
  });

  it('switches and toggles between dark and light mode', () => {
    expect(service.isDark()).toBe(true);
    service.toggleMode();
    expect(service.isDark()).toBe(false);
    expect(service.bodyClass()).toBe('theme-spring-light');

    service.setTheme('autumn');
    service.setMode('dark');
    expect(service.bodyClass()).toBe('theme-autumn-dark');
  });
});
