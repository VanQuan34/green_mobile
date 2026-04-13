import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-layout" [class.mobile-menu-open]="isMobileMenuOpen">
      <div class="sidebar-overlay" (click)="toggleMobileMenu()"></div>
      <aside class="sidebar glass-card" [class.active]="isMobileMenuOpen">
        <div class="sidebar-header">
          <div class="logo">
            <span class="dot"></span>
            <ng-container *ngIf="settings$ | async as settings">
              <h2 *ngIf="(settings.logo_type || 'text') === 'text'">{{ settings.logo_value || '' }}</h2>
              <img *ngIf="settings.logo_type === 'image'" [src]="settings.logo_value" class="logo-img" alt="Logo">
            </ng-container>
            <h2 *ngIf="!(settings$ | async)">DAN Mobile</h2>
          </div>
          <button class="menu-close-btn" (click)="toggleMobileMenu()">✕</button>
        </div>
        
        <nav class="sidebar-nav">
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-item" (click)="closeMobileMenu()">
            <span class="icon">📊</span>
            <span>Tổng quan</span>
          </a>
          <a routerLink="/products" routerLinkActive="active" class="nav-item" (click)="closeMobileMenu()">
            <span class="icon">📱</span>
            <span>Sản phẩm</span>
          </a>
          <a routerLink="/invoices" routerLinkActive="active" class="nav-item" (click)="closeMobileMenu()">
            <span class="icon">🧾</span>
            <span>Hóa đơn</span>
          </a>
          <a routerLink="/debts" routerLinkActive="active" class="nav-item" (click)="closeMobileMenu()">
            <span class="icon">💳</span>
            <span>Công nợ</span>
          </a>
          <a routerLink="/customers" routerLinkActive="active" class="nav-item" (click)="closeMobileMenu()">
            <span class="icon">👥</span>
            <span>Khách hàng</span>
          </a>
          <a routerLink="/settings" routerLinkActive="active" class="nav-item" (click)="closeMobileMenu()">
            <span class="icon">⚙️</span>
            <span>Cài đặt</span>
          </a>
        </nav>
        
        <div class="sidebar-footer">
          <button (click)="onLogout()" class="btn btn-outline btn-logout">
            <span class="icon">🚪</span>
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>
      
      <main class="main-content">
        <header class="top-bar">
          <div class="page-info">
            <button class="hamburger-btn" (click)="toggleMobileMenu()">☰</button>
            <h1 class="page-title">{{ getCurrentPageName() }}</h1>
          </div>
          <div class="user-profile">
            <div class="avatar">{{ getUserInitials() }}</div>
            <span class="username">{{ getUserName() }}</span>
          </div>
        </header>

        <div class="content-area animate-fade-in">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .dashboard-layout {
      display: flex;
      height: 100vh;
      background-color: var(--bg-main);
      overflow: hidden;
    }
    
    .sidebar-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      z-index: 900;
    }
    
    .sidebar {
      width: 260px;
      margin: 1rem;
      display: flex;
      flex-direction: column;
      border-radius: 1.25rem;
      z-index: 1000;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .sidebar-header {
      padding: 2rem 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .menu-close-btn {
      display: none;
      background: none;
      border: none;
      font-size: 1.25rem;
      color: var(--text-muted);
      cursor: pointer;
    }
    
    .logo {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .dot {
      width: 10px;
      height: 10px;
      background-color: var(--primary);
      border-radius: 50%;
      box-shadow: 0 0 10px var(--primary);
    }
    
    .logo h2 {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
    }

    .logo-img {
      height: 32px;
      max-width: 160px;
      object-fit: contain;
    }
    
    .sidebar-nav {
      flex: 1;
      padding: 0 1rem;
    }
    
    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      text-decoration: none;
      color: var(--text-muted);
      border-radius: 0.75rem;
      margin-bottom: 0.5rem;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    
    .nav-item:hover {
      background-color: rgba(16, 185, 129, 0.05);
      color: var(--primary);
    }
    
    .nav-item.active {
      background-color: var(--primary);
      color: white;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }
    
    .sidebar-footer {
      padding: 1.5rem;
      border-top: 1px solid var(--border);
    }
    
    .btn-logout {
      width: 100%;
      justify-content: center;
    }
    
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 1rem 1rem 1rem 0;
    }
    
    .top-bar {
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      margin-bottom: 0.5rem;
    }
    
    .page-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .hamburger-btn {
      display: none;
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--text-main);
      padding: 0.5rem;
      border-radius: 0.5rem;
    }

    .hamburger-btn:hover {
      background: var(--primary-light);
      color: var(--primary);
    }
    
    .page-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-main);
    }
    
    .user-profile {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }
    
    .avatar {
      width: 36px;
      height: 36px;
      background-color: var(--primary-light);
      color: var(--primary-dark);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.8rem;
    }
    
    .username {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-main);
    }
    
    .content-area {
      flex: 1;
      overflow-y: auto;
      padding: 0.5rem 1.5rem 2rem 1.5rem;
    }

    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        left: -280px;
        top: 0;
        bottom: 0;
        margin: 0;
        border-radius: 0;
        width: 260px;
        box-shadow: 10px 0 30px rgba(0, 0, 0, 0.1);
      }

      .sidebar.active {
        left: 0;
      }

      .mobile-menu-open .sidebar-overlay {
        display: block;
      }

      .menu-close-btn {
        display: block;
      }

      .hamburger-btn {
        display: block;
      }

      .main-content {
        padding: 0.5rem;
      }

      .page-title {
        font-size: 1.25rem;
      }

      .username {
        display: none;
      }

      .content-area {
        padding: 0.5rem;
      }
    }
  `]
})
export class LayoutComponent {
  private dataService = inject(DataService);
  isMobileMenuOpen = false;
  settings$ = this.dataService.settings$;

  constructor(private authService: AuthService, private router: Router) {}

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  onLogout() {
    this.authService.logout();
  }

  getUserName(): string {
    const user = this.authService.getUser();
    return user ? user.name : 'Unknown User';
  }

  getUserInitials(): string {
    const name = this.getUserName();
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  getCurrentPageName(): string {
    const url = this.router.url;
    if (url.includes('dashboard')) return 'Báo cáo Tổng quan';
    if (url.includes('products')) return 'Sản phẩm';
    if (url.includes('invoices')) return 'Hóa đơn';
    if (url.includes('debts')) return 'Quản lý Công nợ';
    if (url.includes('settings')) return 'Cài đặt hệ thống';
    if (url.includes('customers')) return 'Danh sách khách hàng';
    return 'DAN Mobile';
  }
}
