import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

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
            <h1>Di Động Xanh</h1>
          </div>
          <p>Chào mừng quay trở lại!</p>
        </div>
        
        <form (ngSubmit)="onLogin()">
          <div class="form-group">
            <label class="required">Mật khẩu quản trị</label>
            <input 
              type="password" 
              [(ngModel)]="password" 
              name="password" 
              placeholder="Nhập mật khẩu..." 
              required
            >
          </div>
          
          <button type="submit" class="btn btn-primary btn-block">
            Đăng nhập hệ thống
          </button>
          
          <p class="error-msg" *ngIf="error">{{ error }}</p>
        </form>
        
        <div class="login-footer">
          <p>© 2026 Di Động Xanh - Hệ thống Quản trị</p>
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
    }
    
    p {
      color: #64748b;
      font-size: 0.875rem;
    }
    
    .form-group {
      text-align: left;
      margin-bottom: 1.5rem;
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
    
    .btn-block {
      width: 100%;
      justify-content: center;
      padding: 0.85rem;
    }
    
    .error-msg {
      margin-top: 1rem;
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
  password = '';
  error = '';

  constructor(private authService: AuthService, private router: Router) {}

  onLogin() {
    if (this.authService.login(this.password)) {
      this.router.navigate(['/products']);
    } else {
      this.error = 'Mật khẩu không chính xác. Thử "admin123"';
    }
  }
}
