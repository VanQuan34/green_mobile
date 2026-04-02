import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product, Invoice } from '../../models/data.models';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-invoice-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay animate-fade-in">
      <div class="modal-content glass-card" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h3>Lập hóa đơn bán hàng</h3>
          <button class="close-btn" (click)="onClose()">✕</button>
        </header>

        <div class="modal-body">
          <!-- Multi-Product Info Summary -->
          <div class="products-container" *ngIf="products.length > 0">
            <label class="section-label">Sản phẩm đã chọn ({{ products.length }})</label>
            <div class="product-list-mini">
              <div class="product-item-mini" *ngFor="let p of products">
                <div class="p-img">
                  <img [src]="p.image || 'https://placehold.co/40x40?text=Phone'" alt="phone">
                </div>
                <div class="p-info">
                  <span class="p-name">{{ p.name }}</span>
                  <span class="p-price">{{ p.sellingPrice | number }}đ</span>
                </div>
              </div>
            </div>
            <div class="total-summary-mini">
              <span>Tổng cộng ({{ products.length }} SP):</span>
              <mark>{{ totalAmount | number }}đ</mark>
            </div>
          </div>

          <form #invoiceForm="ngForm" class="invoice-form">
            <div class="form-group autocomplete-container">
              <label class="required">Họ và tên khách hàng</label>
              <input 
                type="text" 
                [(ngModel)]="invoice.buyerName" 
                name="buyerName" 
                placeholder="Nhập tên khách hàng..." 
                (input)="onCustomerSearch()"
                required
                autocomplete="off"
              >
              <div class="autocomplete-dropdown glass-card" *ngIf="showSuggestions && suggestions.length > 0">
                <div 
                  class="suggestion-item" 
                  *ngFor="let s of suggestions" 
                  (click)="selectCustomer(s)"
                >
                  <div class="s-info">
                    <span class="s-name">{{ s.name }}</span>
                    <span class="s-phone">{{ s.phone }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="required">Số điện thoại</label>
              <input type="text" [(ngModel)]="invoice.buyerPhone" name="buyerPhone" placeholder="0xxx..." required>
            </div>

            <div class="form-group">
              <label class="required">Địa chỉ</label>
              <input type="text" [(ngModel)]="invoice.buyerAddress" name="buyerAddress" placeholder="Địa chỉ giao hàng/liên hệ..." required>
            </div>

            <div class="payment-section">
              <label class="checkbox-container">
                <input type="checkbox" [(ngModel)]="payFull" name="payFull" (change)="onPayFullChange()">
                <span class="checkmark"></span>
                Thanh toán 100% (Tổng: {{ totalAmount | number }}đ)
              </label>

              <div class="form-group animate-fade-in" *ngIf="!payFull">
                <label class="required">Số tiền trả trước (đ)</label>
                <input 
                  type="text" 
                  [ngModel]="formatPrice(invoice.amountPaid)" 
                  (ngModelChange)="onAmountPaidChange($event)"
                  name="amountPaid" 
                  required
                >
                <span class="price-words" *ngIf="invoice.amountPaid > 0">
                  {{ getPriceWords(invoice.amountPaid) }}
                </span>
                <p class="debt-preview" *ngIf="invoice.debt > 0">
                  Còn nợ: <strong>{{ invoice.debt | number }}đ</strong>
                </p>
                <p class="debt-preview text-green" *ngIf="invoice.debt === 0">
                  ✓ Đã thanh toán hết
                </p>
              </div>
            </div>
          </form>
        </div>

        <footer class="modal-footer">
          <button class="btn btn-outline" (click)="onClose()">Hủy bỏ</button>
          <button class="btn btn-primary" (click)="onSubmit()" [disabled]="!invoiceForm.valid">
            Tiếp tục (Xác nhận)
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
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
      padding: 1rem;
    }
    
    .modal-content {
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
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
      color: var(--primary-dark);
      transform: rotate(90deg);
    }
    
    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .products-container {
      background: var(--bg-main);
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      padding: 1rem;
    }

    .section-label {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
      display: block;
      font-weight: 700;
    }

    .product-list-mini {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 150px;
      overflow-y: auto;
      margin-bottom: 1rem;
      padding-right: 0.5rem;
    }

    .product-item-mini {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      background: white;
      border-radius: 0.5rem;
      border: 1px solid var(--border);
    }

    .product-item-mini .p-img img {
      width: 32px;
      height: 32px;
      object-fit: cover;
      border-radius: 4px;
    }

    .product-item-mini .p-info {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.85rem;
    }

    .product-item-mini .p-name {
      font-weight: 600;
      color: var(--text-main);
    }

    .product-item-mini .p-price {
      font-weight: 700;
      color: var(--primary);
    }

    .total-summary-mini {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.75rem;
      border-top: 1px dashed var(--border);
      font-size: 0.9rem;
      font-weight: 600;
    }

    .total-summary-mini mark {
      background: none;
      color: var(--primary);
      font-size: 1.1rem;
      font-weight: 800;
    }
    
    .invoice-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-main);
    }
    
    .autocomplete-container {
      position: relative;
    }
    
    .autocomplete-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 1010;
      max-height: 200px;
      overflow-y: auto;
      margin-top: 5px;
      background: white;
      padding: 0.5rem;
    }
    
    .suggestion-item {
      padding: 0.75rem;
      cursor: pointer;
      border-radius: 6px;
      transition: background 0.2s;
    }
    
    .suggestion-item:hover {
      background: var(--primary-light);
    }
    
    .s-info {
      display: flex;
      flex-direction: column;
    }
    
    .s-name {
      font-weight: 600;
      font-size: 0.9rem;
    }
    
    .s-phone {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    
    .payment-section {
      padding-top: 1rem;
      border-top: 1px dashed var(--border);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .checkbox-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
    }
    
    .debt-preview {
      margin-top: 0.25rem;
      font-size: 0.85rem;
      color: var(--red);
    }

    .price-words {
      font-size: 0.75rem;
      color: var(--primary);
      font-style: italic;
      margin-top: -0.25rem;
    }
    
    .modal-footer {
      padding: 1.25rem 1.5rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
    }

    @media (max-width: 768px) {
      .modal-footer {
        flex-direction: column-reverse;
      }

      .modal-footer button {
        width: 100%;
        justify-content: center;
      }

      .product-summary {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .modal-content {
        max-height: 95vh;
        border-radius: 1rem;
      }
    }
  `]
})
export class InvoiceFormModalComponent implements OnInit {
  @Input() products: Product[] = [];
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<Invoice>();

  invoice!: Invoice;
  payFull = true;
  suggestions: any[] = [];
  showSuggestions = false;

  constructor(private dataService: DataService) {}

  ngOnInit() {
    const totalAmount = this.products.reduce((sum, p) => sum + p.sellingPrice, 0);
    
    this.invoice = {
      id: '',
      buyerName: '',
      buyerAddress: '',
      buyerPhone: '',
      products: this.products,
      totalAmount: totalAmount,
      amountPaid: totalAmount,
      debt: 0,
      isFullyPaid: true,
      createdAt: new Date()
    };
  }

  get totalAmount(): number {
    return this.invoice?.totalAmount || 0;
  }

  formatPrice(val: number): string {
    return this.dataService.formatVND(val);
  }

  parsePrice(val: string): number {
    return this.dataService.parseVND(val);
  }

  getPriceWords(val: number): string {
    return this.dataService.numberToVietnameseWords(val);
  }

  onAmountPaidChange(val: string) {
    const num = this.parsePrice(val);
    this.invoice.amountPaid = num;
    this.calculateDebt();
  }

  onPayFullChange() {
    if (this.payFull) {
      this.invoice.amountPaid = this.totalAmount;
      this.invoice.debt = 0;
      this.invoice.isFullyPaid = true;
    } else {
      this.invoice.isFullyPaid = false;
      this.calculateDebt();
    }
  }

  calculateDebt() {
    this.invoice.debt = Math.max(0, this.totalAmount - (this.invoice.amountPaid || 0));
    this.invoice.isFullyPaid = this.invoice.debt === 0;
  }

  onCustomerSearch() {
    if (this.invoice.buyerName.length < 2) {
      this.showSuggestions = false;
      return;
    }
    this.dataService.getExistingCustomers().subscribe(all => {
      this.suggestions = all.filter(c => 
        c.name.toLowerCase().includes(this.invoice.buyerName.toLowerCase()) ||
        c.phone.includes(this.invoice.buyerName)
      );
      this.showSuggestions = this.suggestions.length > 0;
    });
  }

  selectCustomer(customer: any) {
    this.invoice.buyerName = customer.name;
    this.invoice.buyerPhone = customer.phone;
    this.invoice.buyerAddress = customer.address;
    this.showSuggestions = false;
  }

  onClose() {
    this.close.emit();
  }

  onSubmit() {
    this.calculateDebt();
    this.confirm.emit(this.invoice);
  }
}
