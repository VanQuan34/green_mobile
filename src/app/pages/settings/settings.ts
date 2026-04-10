import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { MediaStoreComponent } from '../../components/media-store/media-store.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, MediaStoreComponent],
  template: `
    <div class="settings-page animate-fade-in">
      <div class="settings-grid">
        <!-- User Profile Section -->
        <div class="settings-card glass-card user-info-card">
          <div class="card-header">
            <span class="icon">👤</span>
            <div class="header-text">
              <h3>Thông tin tài khoản</h3>
              <p>Chi tiết về người dùng đang đăng nhập.</p>
            </div>
          </div>
          <div class="card-body">
            <div class="user-display">
              <div class="large-avatar">{{ getUserInitials() }}</div>
              <div class="user-details">
                <h4 class="name">{{ currentUser?.name }}</h4>
                <p class="role-text">{{ currentUser?.roles?.join(', ') }}</p>
              </div>
            </div>
            
            <div class="info-list">
              <div class="info-item">
                <label>Tên đăng nhập</label>
                <span>{{ currentUser?.username }}</span>
              </div>
              <div class="info-item">
                <label>Email</label>
                <span>{{ currentUser?.email }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Google Sheets Sync Section -->
        <div class="settings-card glass-card">
          <div class="card-header">
            <span class="icon">📊</span>
            <div class="header-text">
              <h3>Đồng bộ Google Sheets</h3>
              <p>Cấu hình liên kết để tự động xuất dữ liệu hóa đơn.</p>
            </div>
          </div>
          
          <div class="card-body">
            <div class="form-group">
              <label for="gsheet_url">Google Apps Script URL</label>
              <div class="input-with-icon">
                <span class="input-icon">🔗</span>
                <input 
                  id="gsheet_url" 
                  type="text" 
                  [(ngModel)]="settings.google_sheet_url" 
                  placeholder="https://script.google.com/macros/s/.../exec"
                >
              </div>
              <p class="help-text">
                Dán URL "Ứng dụng Web" nhận được sau khi Triển khai App Script.
              </p>
            </div>
          </div>
          
          <div class="card-footer">
            <button 
              class="btn btn-primary" 
              (click)="saveSettings()" 
              [disabled]="loading"
            >
              {{ loading ? 'Đang lưu...' : 'Lưu cấu hình' }}
            </button>
          </div>
        </div>

        <!-- Theme Color Section [NEW] -->
        <div class="settings-card glass-card">
          <div class="card-header">
            <span class="icon">🎨</span>
            <div class="header-text">
              <h3>Giao diện & Màu sắc</h3>
              <p>Tùy chỉnh màu chủ đạo của hệ thống.</p>
            </div>
          </div>
          
          <div class="card-body">
            <div class="color-control-wrapper">
              <div class="form-group color-picker-group">
                <label>Bảng màu tùy chỉnh</label>
                <div class="color-input-container">
                  <input 
                    type="color" 
                    [(ngModel)]="settings.primary_color" 
                    (change)="onColorChange()"
                  >
                  <span class="color-hex">{{ settings.primary_color }}</span>
                </div>
              </div>

              <div class="presets-group">
                <label>Màu mẫu có sẵn</label>
                <div class="presets-grid">
                  <button 
                    *ngFor="let preset of presets" 
                    class="preset-item"
                    [style.background-color]="preset.color"
                    [title]="preset.name"
                    [class.active]="settings.primary_color === preset.color"
                    (click)="applyPreset(preset.color)"
                  >
                    <span class="check" *ngIf="settings.primary_color === preset.color">✓</span>
                  </button>
                </div>
              </div>
            </div>

            <div class="preview-area">
              <div class="preview-box">
                <span class="preview-label">Xem trước:</span>
                <button class="btn btn-primary">Nút bấm chính</button>
                <button class="btn btn-outline">Nút bấm phụ</button>
                <div class="status-badge success">Trạng thái</div>
              </div>
            </div>
          </div>
          
          <div class="card-footer">
            <button 
              class="btn btn-primary" 
              (click)="saveSettings()" 
              [disabled]="loading"
            >
              {{ loading ? 'Đang lưu...' : 'Lưu cấu hình giao diện' }}
            </button>
          </div>
        </div>

        <!-- Logo Configuration Section [NEW] -->
        <div class="settings-card glass-card">
          <div class="card-header">
            <span class="icon">🏷️</span>
            <div class="header-text">
              <h3>Cấu hình Logo</h3>
              <p>Thay đổi văn bản hoặc hình ảnh thương hiệu hiển thị trên app.</p>
            </div>
          </div>
          
          <div class="card-body">
            <div class="form-group mb-4">
              <label>Loại Logo</label>
              <div class="type-selector">
                <label class="radio-label">
                  <input type="radio" name="logo_type" [(ngModel)]="settings.logo_type" (change)="onLogoTypeChange()" value="text">
                  <span class="radio-custom"></span>
                  Văn bản
                </label>
                <label class="radio-label">
                  <input type="radio" name="logo_type" [(ngModel)]="settings.logo_type" (change)="onLogoTypeChange()" value="image">
                  <span class="radio-custom"></span>
                  Hình ảnh
                </label>
              </div>
            </div>

            <!-- Text Logo Input -->
            <div class="form-group" *ngIf="settings.logo_type === 'text'">
              <label for="logo_text">Văn bản Logo</label>
              <div class="input-with-icon">
                <span class="input-icon">✍️</span>
                <input 
                  id="logo_text" 
                  type="text" 
                  [(ngModel)]="settings.logo_value" 
                  placeholder="Ví dụ: Di Động Xanh"
                >
              </div>
            </div>

            <!-- Image Logo Selector -->
            <div class="form-group" *ngIf="settings.logo_type === 'image'">
              <label>Hình ảnh Logo</label>
              <div class="logo-preview-container">
                <div class="logo-preview" *ngIf="settings.logo_value">
                  <img [src]="settings.logo_value" alt="Logo Preview">
                </div>
                <div class="logo-placeholder" *ngIf="!settings.logo_value">
                  <span>Chưa chọn ảnh</span>
                </div>
                <button class="btn btn-outline btn-sm" (click)="showLogoPicker = true">
                  {{ settings.logo_value ? 'Thay đổi ảnh' : 'Chọn ảnh từ thư viện' }}
                </button>
              </div>
            </div>

            <!-- Logo Preview (Live) -->
            <div class="preview-area mt-4">
              <div class="preview-box">
                <span class="preview-label">Xem trước thực tế:</span>
                <div class="sidebar-logo-preview">
                  <span class="dot"></span>
                  <h2 *ngIf="settings.logo_type === 'text'">{{ settings.logo_value || 'Di Động Xanh' }}</h2>
                  <div *ngIf="settings.logo_type === 'image' && !settings.logo_value" class="image-placeholder-preview">
                    <span>Trống</span>
                  </div>
                  <img *ngIf="settings.logo_type === 'image' && settings.logo_value" [src]="settings.logo_value" alt="Logo">
                </div>
              </div>
            </div>
          </div>
          
          <app-media-store 
            *ngIf="showLogoPicker" 
            (select)="onLogoSelected($event)" 
            (close)="showLogoPicker = false"
          ></app-media-store>

          <div class="card-footer">
            <button 
              class="btn btn-primary" 
              (click)="saveSettings()" 
              [disabled]="loading"
            >
              {{ loading ? 'Đang lưu...' : 'Lưu cấu hình Logo' }}
            </button>
          </div>
        </div>

        <!-- System Info Card -->
        <div class="settings-card glass-card info-card">
          <div class="card-header">
            <span class="icon">ℹ️</span>
            <div class="header-text">
              <h3>Thông tin hệ thống</h3>
              <p>Phiên bản và trạng thái kết nối.</p>
            </div>
          </div>
          <div class="card-body">
            <div class="info-row">
              <span>Phiên bản v1.2</span>
              <span class="status-badge">Ổn định</span>
            </div>
            <div class="info-row">
              <span>Kết nối Backend</span>
              <span class="status-badge success">Xong</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-page {
      max-width: 800px;
      margin: 0 auto;
    }
    
    .settings-grid {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    
    .settings-card {
      background: white;
      border-radius: 1.25rem;
      border: 1px solid var(--border);
      overflow: hidden;
    }
    
    .card-header {
      padding: 1.5rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      border-bottom: 1px solid var(--border);
      background: rgba(16, 185, 129, 0.03);
    }
    
    .card-header .icon {
      font-size: 1.5rem;
    }
    
    .header-text h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
    }
    
    .header-text p {
      font-size: 0.85rem;
      color: var(--text-muted);
      margin: 0;
    }
    
    .card-body {
      padding: 1.5rem;
    }

    /* User Card Styles */
    .user-display {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }

    .large-avatar {
      width: 64px;
      height: 64px;
      background: var(--primary);
      color: white;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 800;
      box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);
    }

    .user-details .name {
      font-size: 1.25rem;
      font-weight: 700;
      margin: 0;
      color: var(--text-main);
    }

    .role-text {
      font-size: 0.85rem;
      color: var(--primary);
      font-weight: 600;
      margin: 0;
      text-transform: capitalize;
    }

    .info-list {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }

    .info-item label {
      display: block;
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: uppercase;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .info-item span {
      font-weight: 600;
      color: var(--text-main);
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .form-group label {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-main);
    }
    
    .input-with-icon {
      position: relative;
    }
    
    .input-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
    }
    
    .input-with-icon input {
      width: 100%;
      padding-left: 2.75rem;
      background: var(--bg-main);
      border: 1px solid var(--border);
    }
    
    .help-text {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-style: italic;
      margin-top: 0.5rem;
    }
    
    .card-footer {
      padding: 1rem 1.5rem;
      background: #fafafa;
      display: flex;
      justify-content: flex-end;
    }
    
    .info-card {
      background: #f8fafc;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      font-size: 0.9rem;
    }
    
    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 6px;
      background: #e2e8f0;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    
    .status-badge.success {
      background: var(--primary-light);
      color: var(--primary-dark);
    }

    /* Color Specific Styles */
    .color-control-wrapper {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .color-input-container {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-top: 0.5rem;
    }

    input[type="color"] {
      -webkit-appearance: none;
      border: none;
      width: 40px;
      height: 40px;
      padding: 0;
      border-radius: 8px;
      cursor: pointer;
      overflow: hidden;
    }

    input[type="color"]::-webkit-color-swatch-wrapper {
      padding: 0;
    }

    input[type="color"]::-webkit-color-swatch {
      border: none;
    }

    .color-hex {
      font-family: monospace;
      font-weight: 700;
      color: var(--text-main);
      background: var(--bg-main);
      padding: 0.5rem 0.75rem;
      border-radius: 6px;
      border: 1px solid var(--border);
    }

    .presets-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 0.5rem;
    }

    .preset-item {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 0 1px var(--border);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .preset-item:hover {
      transform: scale(1.1);
    }

    .preset-item.active {
      transform: scale(1.1);
      box-shadow: 0 0 0 2px var(--primary);
    }

    .preset-item .check {
      color: white;
      font-size: 14px;
      font-weight: bold;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }

    .preview-area {
      background: #f1f5f9;
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px dashed var(--border);
    }

    .preview-box {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .preview-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    @media (max-width: 600px) {
      .color-control-wrapper {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
    }


    /* Logo Specific Styles */
    .type-selector {
      display: flex;
      gap: 2rem;
      margin-top: 0.5rem;
    }

    .radio-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-weight: 500;
      color: var(--text-main);
    }

    .logo-preview-container {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 1rem;
      background: var(--bg-main);
      border-radius: 12px;
      border: 1px solid var(--border);
    }

    .logo-preview {
      height: 40px;
      background: white;
      padding: 5px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border);
    }

    .logo-preview img {
      max-height: 100%;
      object-fit: contain;
    }

    .logo-placeholder {
      font-size: 0.85rem;
      color: var(--text-muted);
      font-style: italic;
    }

    .sidebar-logo-preview {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }

    .sidebar-logo-preview .dot {
      width: 8px;
      height: 8px;
      background-color: var(--primary);
      border-radius: 50%;
    }

    .sidebar-logo-preview h2 {
      font-size: 1rem;
      font-weight: 700;
      margin: 0;
      color: var(--text-main);
    }

    .sidebar-logo-preview img {
      height: 24px;
      object-fit: contain;
    }

    .image-placeholder-preview {
      height: 24px;
      width: 80px;
      background: #e2e8f0;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.65rem;
      color: #94a3b8;
      text-transform: uppercase;
      font-weight: 700;
    }

    .mb-4 { margin-bottom: 1.5rem; }
    .mt-4 { margin-top: 1.5rem; }
  `]
})
export class SettingsComponent implements OnInit {
  settings: any = {
    google_sheet_url: '',
    primary_color: '#10b981',
    logo_type: 'text',
    logo_value: 'Di Động Xanh'
  };
  currentUser: any;
  presets: any[] = [];
  loading = false;
  showLogoPicker = false;

  constructor(
    private dataService: DataService,
    private authService: AuthService,
    private themeService: ThemeService
  ) {}

  ngOnInit() {
    this.currentUser = this.authService.getUser();
    this.presets = this.themeService.getPresets();
    this.settings.primary_color = this.themeService.loadStoredTheme();
    this.loadSettings();
  }

  loadSettings() {
    this.dataService.getSettings().subscribe(res => {
      this.settings.google_sheet_url = res.google_sheet_url || '';
      this.settings.logo_type = res.logo_type || 'text';
      this.settings.logo_value = res.logo_value || 'Di Động Xanh';
    });
  }

  saveSettings() {
    // Validate Logo
    if (this.settings.logo_type === 'image' && (!this.settings.logo_value || !this.settings.logo_value.startsWith('http'))) {
      alert('Vui lòng chọn hình ảnh logo từ thư viện trước khi lưu!');
      return;
    }

    this.loading = true;
    // Lưu tất cả cấu hình lên DB
    const dbSettings = {
      google_sheet_url: this.settings.google_sheet_url,
      logo_type: this.settings.logo_type,
      logo_value: this.settings.logo_value
    };
    
    this.dataService.updateSettings(dbSettings)
      .subscribe({
        next: () => {
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  onColorChange() {
    this.themeService.applyTheme(this.settings.primary_color);
  }

  onLogoTypeChange() {
    // Nếu chuyển sang ảnh mà giá trị hiện tại không phải URL (có thể là text cũ)
    // thì xóa đi để bắt người dùng chọn ảnh mới
    if (this.settings.logo_type === 'image' && this.settings.logo_value && !this.settings.logo_value.startsWith('http')) {
      this.settings.logo_value = '';
    }
  }

  applyPreset(color: string) {
    this.settings.primary_color = color;
    this.onColorChange();
  }

  onLogoSelected(url: string) {
    this.settings.logo_value = url;
    this.showLogoPicker = false;
  }

  getUserInitials(): string {
    if (!this.currentUser?.name) return '??';
    const parts = this.currentUser.name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return this.currentUser.name.slice(0, 2).toUpperCase();
  }
}
