import { Component, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ToastComponent } from './components/toast/toast';
import { ThemeService } from './services/theme.service';
import { DataService } from './services/data.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private dataService = inject(DataService);
  protected readonly title = signal('green-mobile');
  initialized$ = this.dataService.initialized$;

  constructor(private themeService: ThemeService) {
    this.themeService.loadStoredTheme();
  }
}
