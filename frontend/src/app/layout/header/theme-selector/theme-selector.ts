import { Component, inject } from '@angular/core';
import { Theme, ThemeName } from '../../../core/services/theme';

@Component({
  imports: [],
  selector: 'app-theme-selector',
  styleUrl: './theme-selector.css',
  templateUrl: './theme-selector.html',
})
export class ThemeSelector {
  protected readonly themeService = inject(Theme);

  protected onThemeSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.themeService.setTheme(select.value as ThemeName);
  }
}
