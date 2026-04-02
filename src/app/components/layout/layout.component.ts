import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard-layout">
      <aside class="sidebar glass-card">
        <div class="sidebar-header">
          <div class="logo">
            <span class="dot"></span>
            <h2>Di Động Xanh</h2>
          </div>
        </div>
        
        <nav class="sidebar-nav">
          <a routerLink="/products" routerLinkActive="active" class="nav-item">
            <span class="icon">📱</span>
            <span>Sản phẩm</span>
          </a>
          <a routerLink="/invoices" routerLinkActive="active" class="nav-item">
            <span class="icon">🧾</span>
            <span>Hóa đơn</span>
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
            <h1 class="page-title">{{ getCurrentPageName() }}</h1>
          </div>
          <div class="user-profile">
            <div class="avatar">AD</div>
            <span class="username">Quản trị viên</span>
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
    }
    
    .sidebar {
      width: 260px;
      margin: 1rem;
      display: flex;
      flex-direction: column;
      border-radius: 1.25rem;
      z-index: 10;
    }
    
    .sidebar-header {
      padding: 2rem 1.5rem;
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
  `]
})
export class LayoutComponent {
  constructor(private authService: AuthService, private router: Router) {}

  onLogout() {
    this.authService.logout();
  }

  getCurrentPageName(): string {
    const url = this.router.url;
    if (url.includes('products')) return 'Danh sách sản phẩm';
    if (url.includes('invoices')) return 'Danh sách hóa đơn';
    return 'Tổng quan';
  }
}
