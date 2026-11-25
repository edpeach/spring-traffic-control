import { DOCUMENT } from '@angular/common';
import { computed, effect, inject, Service, signal } from '@angular/core';

export type ThemeName = 'spring' | 'summer' | 'autumn' | 'winter';
export type ThemeMode = 'dark' | 'light';

export interface ThemeOption {
  id: ThemeName;
  label: string;
}

const ALL_THEME_CLASSES = [
  'theme-spring-dark',
  'theme-spring-light',
  'theme-summer-dark',
  'theme-summer-light',
  'theme-autumn-dark',
  'theme-autumn-light',
  'theme-winter-dark',
  'theme-winter-light',
] as const;

@Service()
export class Theme {
  private readonly document = inject(DOCUMENT);

  readonly themes: readonly ThemeOption[] = [
    { id: 'spring', label: 'Spring' },
    { id: 'summer', label: 'Summer' },
    { id: 'autumn', label: 'Autumn' },
    { id: 'winter', label: 'Winter' },
  ];

  readonly theme = signal<ThemeName>('spring');
  readonly mode = signal<ThemeMode>('dark');
  readonly isDark = computed(() => this.mode() === 'dark');
  readonly bodyClass = computed(() => `theme-${this.theme()}-${this.mode()}`);

  constructor() {
    effect(() => {
      const classList = this.document.body.classList;
      classList.remove(...ALL_THEME_CLASSES);
      classList.add(this.bodyClass());
    });
  }

  setTheme(theme: ThemeName): void {
    this.theme.set(theme);
  }

  cycleTheme(): void {
    const order = this.themes.map((option) => option.id);
    this.theme.update((current) => order[(order.indexOf(current) + 1) % order.length]);
  }

  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  toggleMode(): void {
    this.mode.update((current) => (current === 'dark' ? 'light' : 'dark'));
  }
}
