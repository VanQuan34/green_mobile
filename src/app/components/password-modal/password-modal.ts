import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, ElementRef, Renderer2, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Invoice } from '../../models/data.models';
import { DataService } from '../../services/data.service';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-password-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay animate-fade-in" (click)="!isDeleting && onClose()">
      <div class="modal-content glass-card animate-scale-up" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-icon danger">
            <i class="ri-delete-bin-line"></i>
          </div>
          <h3>Xác nhận xóa hóa đơn</h3>
          <p class="text-muted">Hành động này sẽ khôi phục trạng thái cho các sản phẩm trong đơn hàng về kho.</p>
        </header>

        <div class="modal-body">
          <!-- Invoice Summary -->
          <div class="invoice-summary glass-card">
            <div class="summary-row">
              <span class="label">Khách hàng:</span>
              <span class="value">{{ invoice.buyerName }}</span>
            </div>
            <div class="summary-row">
              <span class="label">Số điện thoại:</span>
              <span class="value">{{ invoice.buyerPhone }}</span>
            </div>
            <div class="summary-row items-row">
              <span class="label">Sản phẩm:</span>
              <div class="value-list">
                <ng-container *ngIf="invoice.products && invoice.products.length > 0; else legacyP">
                  <div *ngFor="let p of invoice.products" class="p-item">
                    {{ p.name }} ({{ p.color }})
                  </div>
                </ng-container>
                <ng-template #legacyP>
                  <div class="p-item">{{ invoice.productName }}</div>
                </ng-template>
              </div>
            </div>
            <div class="summary-row total-row">
              <span class="label">Tổng tiền:</span>
              <span class="value">{{ (invoice.totalAmount || 0) | number }}đ</span>
            </div>
          </div>

          <!-- Password Input -->
          <div class="password-section">
            <label class="section-label">Xác nhận mật khẩu</label>
            <div class="input-group glass-card" [class.error]="errorMsg" [class.disabled]="isDeleting">
              <i class="ri-lock-2-line input-icon"></i>
              <input 
                [type]="showPassword ? 'text' : 'password'" 
                [(ngModel)]="password" 
                placeholder="Nhập mật khẩu để tiếp tục..."
                (keyup.enter)="onConfirm()"
                [disabled]="isDeleting"
                #passwordInput
              >
              <button class="toggle-password" (click)="showPassword = !showPassword" [disabled]="isDeleting" style="    padding: 0;
    border: 0;">
                <i [class]="showPassword ? 'ri-eye-off-line' : 'ri-eye-line'"></i>
              </button>
            </div>
            <p class="error-text" *ngIf="errorMsg">{{ errorMsg }}</p>
          </div>
        </div>

        <footer class="modal-footer">
          <button class="btn btn-outline" (click)="onClose()" [disabled]="isDeleting">Hủy bỏ</button>
          <button class="btn btn-danger" (click)="onConfirm()" [disabled]="!password.trim() || isDeleting">
            <span class="spinner" *ngIf="isDeleting"></span>
            {{ isDeleting ? 'Đang thực hiện...' : 'Xác nhận xóa' }}
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      z-index: 11000; padding: 1.5rem;
    }
    
    .modal-content {
      width: 100%; max-width: 450px;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 1.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.3);
      overflow: hidden;
    }

    .modal-header {
      padding: 2rem 2rem 1rem;
      text-align: center;
    }

    .header-icon {
      width: 60px; height: 60px;
      border-radius: 1.25rem;
      display: flex; align-items: center; justify-content: center;
      font-size: 2rem; margin: 0 auto 1.25rem;
    }

    .header-icon.danger {
      background: #fee2e2;
      color: #ef4444;
      box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.2);
    }

    .modal-header h3 { font-size: 1.25rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; }
    .modal-header p { font-size: 0.9rem; line-height: 1.4; color: #64748b; }
    
    .modal-body { padding: 1rem 2rem 1.5rem; }

    .invoice-summary {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 1.25rem;
      border-radius: 1rem;
      margin-bottom: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
    }

    .summary-row .label { color: #64748b; font-weight: 500; }
    .summary-row .value { color: #0f172a; font-weight: 700; text-align: right; }

    .items-row { flex-direction: column; gap: 0.4rem; }
    .value-list { display: flex; flex-direction: column; gap: 0.25rem; align-items: flex-end; }
    .p-item { padding: 0.2rem 0.6rem; background: #e2e8f0; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }

    .total-row {
      margin-top: 0.25rem;
      padding-top: 0.75rem;
      border-top: 1px dashed #cbd5e1;
    }
    .total-row .value { color: #ef4444; font-size: 1.1rem; }

    .section-label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 0.6rem;
    }

    .input-group {
      display: flex; align-items: center;
      padding: 0.85rem 1rem; gap: 0.75rem;
      background: white; border: 2px solid #e2e8f0;
      transition: all 0.2s; border-radius: 0.75rem;
    }

    .input-group:focus-within {
      border-color: #3b82f6;
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
    }

    .input-group.disabled { background: #f1f5f9; cursor: not-allowed; opacity: 0.7; }
    .input-group.error { border-color: #ef4444; }

    .input-group input { border: none; background: none; flex: 1; outline: none; font-size: 1rem; }

    .error-text { color: #ef4444; font-size: 0.8rem; margin-top: 0.5rem; font-weight: 600; }

    .modal-footer { padding: 0.5rem 2rem 2rem; display: flex; gap: 1rem; }

    .btn {
      flex: 1; padding: 1rem; border-radius: 1rem;
      font-weight: 700; font-size: 0.95rem;
      cursor: pointer; transition: all 0.2s;
      display: flex; align-items: center; justify-content: center; gap: 0.6rem;
      border: none;
    }

    .btn-outline { background: #f1f5f9; color: #475569; }
    .btn-outline:hover:not(:disabled) { background: #e2e8f0; color: #0f172a; }

    .btn-danger { background: #ef4444; color: white; }
    .btn-danger:hover:not(:disabled) { background: #dc2626; transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3); }
    .btn-danger:disabled { opacity: 0.6; cursor: not-allowed; }

    .spinner {
      width: 1.2rem; height: 1.2rem;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%; border-top-color: white;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes modalScaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    .animate-scale-up { animation: modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
  `]
})
export class PasswordModalComponent implements OnInit, OnDestroy {
  @Input() invoice!: Invoice;
  @Output() deleted = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  password = '';
  showPassword = false;
  errorMsg = '';
  isDeleting = false;

  private dataService = inject(DataService);
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);

  ngOnInit() {
    this.renderer.appendChild(document.body, this.el.nativeElement);
    setTimeout(() => {
      const input = this.el.nativeElement.querySelector('input');
      if (input) input.focus();
    }, 400);
  }

  ngOnDestroy() {
    this.renderer.removeChild(document.body, this.el.nativeElement);
  }

  onConfirm() {
    if (this.isDeleting) return;
    if (!this.password.trim()) {
      this.errorMsg = 'Vui lòng nhập mật khẩu';
      return;
    }

    this.isDeleting = true;
    this.errorMsg = '';

    this.dataService.deleteInvoice(this.invoice.id, this.password)
      .pipe(finalize(() => this.isDeleting = false))
      .subscribe({
        next: () => {
          this.deleted.emit();
          this.onClose();
        },
        error: (err) => {
          this.errorMsg = err.error?.message || 'Mật khẩu không chính xác';
        }
      });
  }

  onClose() {
    this.close.emit();
  }
}
