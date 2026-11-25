import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

@Component({
  imports: [RouterLink, RouterLinkActive],
  selector: 'app-navigation',
  styleUrl: './navigation.css',
  templateUrl: './navigation.html',
})
export class Navigation {
  protected readonly navItems: readonly NavItem[] = [
    { label: 'Stations', path: '/stations', icon: 'radar' },
    { label: 'Flights', path: '/flights', icon: 'flight' },
    { label: 'Map', path: '/map', icon: 'map' },
    { label: 'Agent', path: '/agent', icon: 'smart_toy' },
  ];

  protected closePopover(popoverEl: HTMLElement): void {
    popoverEl.hidePopover?.();
  }
}
