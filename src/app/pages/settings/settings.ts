import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page animate-fade-in">
      <div class="settings-grid">
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

        <!-- System Info Card (Read only example) -->
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
  `]
})
export class SettingsComponent implements OnInit {
  settings: any = {
    google_sheet_url: ''
  };
  loading = false;

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    this.dataService.getSettings().subscribe(res => {
      this.settings = { ...this.settings, ...res };
    });
  }

  saveSettings() {
    this.loading = true;
    this.dataService.updateSettings(this.settings)
      .subscribe({
        next: () => {
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }
}
