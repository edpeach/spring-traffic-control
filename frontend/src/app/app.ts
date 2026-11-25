import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { AgentDrawer } from './features/agent/components/agent-drawer/agent-drawer';
import { Footer } from './layout/footer/footer';
import { Header } from './layout/header/header';

@Component({
  imports: [Header, RouterOutlet, Footer, AgentDrawer],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly router = inject(Router);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url),
      startWith(this.router.url),
    ),
    { initialValue: this.router.url },
  );

  protected readonly isMapRoute = computed(() => this.currentUrl().startsWith('/map'));
  protected readonly isAgentRoute = computed(() => this.currentUrl().startsWith('/agent'));
  protected readonly isFullBleedRoute = computed(() => this.isMapRoute() || this.isAgentRoute());
}
