import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Invoice } from '../../models/data.models';

@Component({
  selector: 'app-invoice-detail-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay animate-fade-in" (click)="onClose()">
      <div class="modal-content glass-card" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-title">
            <h3>Chi tiết hóa đơn</h3>
            <span class="invoice-date text-muted">{{ invoice.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
          </div>
          <button class="close-btn" (click)="onClose()">✕</button>
        </header>

        <div class="modal-body">
          <div class="detail-container">
            <!-- Customer Info -->
            <div class="detail-section">
              <label>Thông tin khách hàng</label>
              <div class="info-card">
                <p class="customer-name"><strong>{{ invoice.buyerName }}</strong></p>
                <p class="customer-phone">{{ invoice.buyerPhone }}</p>
                <p class="customer-address text-muted">{{ invoice.buyerAddress }}</p>
              </div>
            </div>

            <!-- Products List -->
            <div class="detail-section">
              <label>Danh sách sản phẩm ({{ invoice.products?.length || 0 }})</label>
              <div class="info-card product-list-detailed">
                <div class="p-detail-item" *ngFor="let p of invoice.products">
                  <div class="p-main">
                    <span class="p-name">{{ p.name }}</span>
                    <div class="imei p-specs" *ngIf="p.imei" style="margin: 6px 0;"><strong>IMEI: </strong> {{p.imei}}</div>
                    <div class="p-meta">
                      <span class="p-specs text-muted">{{ p.capacity }} | {{ p.color }}</span>
                      <strong class="buy-date" *ngIf="p.purchaseDate">{{ p.purchaseDate | date:'dd/MM/yyyy' }}</strong>
                    </div>
                    <div class="p-payment-info animate-fade-in" *ngIf="p.debt! > 0 || p.amountPaid! > 0">
                      <span class="p-paid">Đã trả: <strong>{{ p.amountPaid | number }}đ</strong></span>
                      <span class="p-debt">Còn nợ: <strong>{{ p.debt | number }}đ</strong></span>
                    </div>
                  </div>
                  <span class="p-price">{{ p.sellingPrice | number }}đ</span>
                </div>
                <!-- Legacy support -->
                <div class="p-detail-item" *ngIf="!invoice.products || invoice.products.length === 0">
                  <div class="p-main">
                    <span class="p-name">{{ invoice.productName }}</span>
                  </div>
                  <span class="p-price">{{ invoice.productPrice | number }}đ</span>
                </div>
              </div>
            </div>

            <!-- Payment Summary -->
            <div class="detail-section">
              <label>Chi tiết thanh toán</label>
              <div class="payment-summary-card" [class.has-debt]="invoice.debt > 0">
                <div class="summary-row">
                  <span>Tổng tiền hàng:</span>
                  <span class="amount">{{ invoice.totalAmount | number }}đ</span>
                </div>
                <div class="summary-row paid-row">
                  <span>Đã thanh toán:</span>
                  <span class="amount text-green">{{ invoice.amountPaid | number }}đ</span>
                </div>
                <div class="summary-row debt-row" *ngIf="invoice.debt > 0">
                  <span>Còn nợ:</span>
                  <span class="amount text-red">{{ invoice.debt | number }}đ</span>
                </div>
                <div class="payment-status" *ngIf="invoice.debt === 0">
                  <span class="status-badge success">✓ Đã thanh toán đầy đủ</span>
                </div>
                 <div class="payment-status" *ngIf="invoice.debt > 0">
                  <span class="status-badge warning">⏳ Còn nợ</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <button class="btn btn-primary" (click)="onClose()">Đóng</button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 1rem;
    }
    
    .modal-content {
      width: 100%;
      max-width: 500px;
      background: white;
      display: flex;
      flex-direction: column;
      border-radius: 1.25rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      animation: modalScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes modalScale {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-title {
      display: flex;
      flex-direction: column;
    }

    .invoice-date {
      font-size: 0.75rem;
    }
    
    .close-btn {
      background: none;
      border: none;
      font-size: 1.25rem;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: var(--primary-light);
      transform: rotate(90deg);
    }
    
    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      max-height: 70vh;
    }
    
    .detail-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    
    .detail-section label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      display: block;
      font-weight: 700;
    }
    
    .info-card {
      padding: 1rem;
      background: var(--bg-main);
      border-radius: 0.75rem;
      border: 1px solid var(--border);
    }

    .customer-name {
      font-size: 1.1rem;
      margin-bottom: 0.25rem;
    }

    .product-list-detailed {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .p-detail-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 0.5rem;
      border-bottom: 1px dashed var(--border);
    }

    .p-detail-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .p-main {
      display: flex;
      flex-direction: column;
      flex: 1;
    }

    .p-meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .p-payment-info {
      display: flex;
      gap: 1rem;
      margin-top: 0.25rem;
      font-size: 0.75rem;
    }

    .p-paid {
      color: var(--green);
    }

    .p-debt {
      color: var(--red);
    }

    .p-name {
      font-weight: 600;
      color: var(--text-main);
    }

    .p-specs {
      font-size: 0.75rem;
    }

    .p-price {
      font-weight: 700;
      color: var(--primary);
    }

    .buy-date {
      display: inline-block;
      margin-left: 0.5rem;
      color: var(--primary-dark);
      font-weight: 700;
      background: var(--primary-light);
      padding: 0.1rem 0.3rem;
      border-radius: 4px;
      font-size: 0.65rem;
    }

    .payment-summary-card {
      padding: 1.25rem;
      border-radius: 1rem;
      background: white;
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.95rem;
    }

    .amount {
      font-weight: 700;
    }

    .paid-row {
      padding-top: 0.5rem;
      border-top: 1px solid var(--border);
    }

    .debt-row {
      color: var(--red);
    }

    .payment-status {
      margin-top: 0.5rem;
      display: flex;
      justify-content: center;
    }

    .status-badge {
      padding: 0.4rem 1rem;
      border-radius: 2rem;
      font-size: 0.85rem;
      font-weight: 700;
    }

    .status-badge.success {
      background: var(--green-light);
      color: var(--green);
    }

    .status-badge.warning {
      background: var(--orange-light);
      color: var(--orange);
    }

    .modal-footer {
      padding: 1.25rem 1.5rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
    }

    .text-green { color: var(--green); }
    .text-red { color: var(--red); }
  `]
})
export class InvoiceDetailModalComponent implements OnInit, OnDestroy {
  @Input() invoice!: Invoice;
  @Output() close = new EventEmitter<void>();

  constructor(private el: ElementRef, private renderer: Renderer2) { }

  ngOnInit() {
    this.renderer.appendChild(document.body, this.el.nativeElement);
  }

  ngOnDestroy() {
    this.renderer.removeChild(document.body, this.el.nativeElement);
  }

  onClose() {
    this.close.emit();
  }
}
