import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Navigation } from './navigation/navigation';
import { ThemeSelector } from './theme-selector/theme-selector';

@Component({
  imports: [RouterLink, Navigation, ThemeSelector],
  selector: 'app-header',
  styleUrl: './header.css',
  templateUrl: './header.html',
})
export class Header {}
