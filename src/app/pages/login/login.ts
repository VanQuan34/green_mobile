import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { DataService } from '../../services/data.service';
import { inject } from '@angular/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="login-container">
      <div class="glass-card login-card animate-fade-in">
        <div class="login-header">
          <div class="logo">
            <span class="dot"></span>
            <ng-container *ngIf="settings$ | async as settings">
              <h1 *ngIf="(settings.logo_type || 'text') === 'text'">{{ settings.logo_value || 'Di Động Xanh' }}</h1>
              <img *ngIf="settings.logo_type === 'image'" [src]="settings.logo_value" class="logo-img" alt="Logo">
            </ng-container>
            <h1 *ngIf="!(settings$ | async)">Di Động Xanh</h1>
          </div>
          <p>Chào mừng quay trở lại!</p>
        </div>
        
        <form (ngSubmit)="onLogin()">
          <div class="form-group">
            <label class="required">Tên đăng nhập</label>
            <input 
              type="text" 
              [(ngModel)]="username" 
              name="username" 
              placeholder="Nhập tên đăng nhập..." 
              required
              [disabled]="loading"
            >
          </div>

          <div class="form-group">
            <label class="required">Mật khẩu</label>
            <input 
              type="password" 
              [(ngModel)]="password" 
              name="password" 
              placeholder="Nhập mật khẩu..." 
              required
              [disabled]="loading"
            >
          </div>
          
          <button type="submit" class="btn btn-primary btn-block" [disabled]="loading">
            {{ loading ? 'Đang xác thực...' : 'Đăng nhập hệ thống' }}
          </button>
          
          <p class="error-msg" *ngIf="error">{{ error }}</p>
        </form>
        
        <div class="login-footer">
          <p>© 2026 {{ (settings$ | async)?.logo_value || 'Di Động Xanh' }} - Hệ thống Quản trị</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-container {
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #10b981 0%, #064e3b 100%);
    }
    
    .login-card {
      width: 100%;
      max-width: 400px;
      padding: 2.5rem;
      text-align: center;
    }
    
    .login-header {
      margin-bottom: 2rem;
    }
    
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }
    
    .dot {
      width: 12px;
      height: 12px;
      background-color: #10b981;
      border-radius: 50%;
      box-shadow: 0 0 10px #10b981;
    }
    
    h1 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e293b;
      margin: 0;
    }

    .logo-img {
      height: 48px;
      max-width: 240px;
      object-fit: contain;
    }
    
    p {
      color: #64748b;
      font-size: 0.875rem;
    }
    
    .form-group {
      text-align: left;
      margin-bottom: 1.25rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #334155;
    }
    
    input {
      width: 100%;
    }

    input:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    
    .btn-block {
      width: 100%;
      justify-content: center;
      padding: 0.85rem;
      margin-top: 1rem;
    }

    .btn-block:disabled {
      opacity: 0.8;
      cursor: wait;
    }
    
    .error-msg {
      margin-top: 1rem;
      padding: 0.75rem;
      background: #fef2f2;
      border: 1px solid #fee2e2;
      border-radius: 8px;
      color: #ef4444;
      font-size: 0.8rem;
    }
    
    .login-footer {
      margin-top: 2rem;
      opacity: 0.6;
    }

    @media (max-width: 480px) {
      .login-card {
        padding: 1.5rem;
        margin: 1rem;
      }
      
      .logo h1 {
        font-size: 1.25rem;
      }
    }
  `]
})
export class LoginComponent {
  private dataService = inject(DataService);
  username = '';
  password = '';
  error = '';
  loading = false;
  settings$ = this.dataService.settings$;

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    if (!this.username || !this.password) {
      this.error = 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.message || 'Đăng nhập thất bại. Hệ thống không phản hồi.';
      }
    });
  }
}
