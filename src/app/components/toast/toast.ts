import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastMessage } from '../../services/toast.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div 
        *ngFor="let toast of toasts" 
        class="toast-item animate-slide-in"
        [ngClass]="toast.type"
      >
        <span class="icon">{{ getIcon(toast.type) }}</span>
        <span class="msg">{{ toast.message }}</span>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 1.5rem;
      right: 1.5rem;
      z-index: 99999;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      pointer-events: none;
    }

    .toast-item {
      pointer-events: auto;
      min-width: 280px;
      padding: 0.75rem 1.25rem;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(8px);
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      display: flex;
      align-items: center;
      gap: 0.75rem;
      border: 1px solid rgba(0,0,0,0.05);
    }

    .toast-item.success { border-left: 4px solid #10b981; }
    .toast-item.error { border-left: 4px solid #ef4444; }
    .toast-item.info { border-left: 4px solid #3b82f6; }

    .icon { font-size: 1.1rem; }
    .msg { font-size: 0.9rem; font-weight: 500; color: #1f2937; }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    .animate-slide-in {
      animation: slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: ToastMessage[] = [];
  private sub?: Subscription;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.sub = this.toastService.toast$.subscribe(msg => {
      this.toasts.push(msg);
      setTimeout(() => {
        this.toasts = this.toasts.filter(t => t !== msg);
      }, 4000);
    });
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }

  getIcon(type: string) {
    switch(type) {
      case 'success': return '✅';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  }
}
