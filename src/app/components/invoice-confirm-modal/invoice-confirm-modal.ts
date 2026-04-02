import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Invoice } from '../../models/data.models';

@Component({
  selector: 'app-invoice-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay animate-fade-in" (click)="onBack()">
      <div class="modal-content glass-card" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h3>Xác nhận lập hóa đơn</h3>
          <button class="close-btn" (click)="onBack()">✕</button>
        </header>

        <div class="modal-body">
          <div class="confirm-summary">
            <div class="summary-section">
              <label>Khách hàng</label>
              <div class="info-box">
                <p><strong>{{ invoice.buyerName }}</strong></p>
                <p>{{ invoice.buyerPhone }}</p>
                <p class="text-muted">{{ invoice.buyerAddress }}</p>
              </div>
            </div>

            <div class="summary-section">
              <label>Sản phẩm</label>
              <div class="info-box">
                <p><strong>{{ invoice.productName }}</strong></p>
                <p class="text-muted">Đơn giá: {{ invoice.productPrice | number }}đ</p>
              </div>
            </div>

            <div class="summary-section">
              <label>Thanh toán</label>
              <div class="payment-box" [class.is-debt]="invoice.debt > 0">
                <div class="row">
                  <span>Tổng tiền:</span>
                  <strong>{{ invoice.productPrice | number }}đ</strong>
                </div>
                <div class="row">
                  <span>Đã thanh toán:</span>
                  <strong>{{ invoice.amountPaid | number }}đ</strong>
                </div>
                <div class="row total-row" *ngIf="invoice.debt > 0">
                  <span>Còn nợ:</span>
                  <strong class="text-red">{{ invoice.debt | number }}đ</strong>
                </div>
                <div class="row total-row" *ngIf="invoice.debt === 0">
                  <span class="text-green">✓ Đã tất toán 100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <button class="btn btn-outline" (click)="onBack()">Quay lại sửa</button>
          <button class="btn btn-primary" (click)="onConfirm()">
            Xác nhận & Lưu hóa đơn
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      padding: 1rem;
    }
    
    .modal-content {
      width: 100%;
      max-width: 450px;
      background: white;
      box-shadow: var(--shadow-lg);
    }
    
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .modal-body {
      padding: 1.5rem;
    }
    
    .confirm-summary {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    
    .summary-section label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      display: block;
    }
    
    .info-box {
      padding: 0.75rem;
      background: var(--bg-main);
      border-radius: 0.5rem;
      border: 1px solid var(--border);
    }
    
    .payment-box {
      padding: 1rem;
      background: var(--primary-light);
      border-radius: 0.75rem;
      border: 1px solid var(--primary);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .payment-box.is-debt {
      background: var(--red-light);
      border-color: var(--red);
    }
    
    .row {
      display: flex;
      justify-content: space-between;
      font-size: 0.9rem;
    }
    
    .total-row {
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px dashed rgba(0,0,0,0.1);
      font-weight: 700;
    }
    
    .text-red { color: var(--red); }
    .text-green { color: var(--green); font-weight: 700; }
    
    .modal-footer {
      padding: 1.25rem 1.5rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
    }
  `]
})
export class InvoiceConfirmModalComponent {
  @Input() invoice!: Invoice;
  @Output() back = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();

  onBack() {
    this.back.emit();
  }

  onConfirm() {
    this.confirm.emit();
  }
}
