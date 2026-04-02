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
          <!-- Product Info Summary -->
          <div class="product-summary" *ngIf="product">
            <div class="p-img">
              <img [src]="product.image || 'https://placehold.co/60x60?text=Phone'" alt="phone">
            </div>
            <div class="p-details">
              <h4>{{ product.name }}</h4>
              <p class="p-meta">
                <span>{{ product.capacity }}</span> | <span>{{ product.color }}</span>
              </p>
              <p class="p-price">{{ product.sellingPrice | number }}đ</p>
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
                Thanh toán 100% (Giá: {{ product.sellingPrice | number }}đ)
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
    
    .product-summary {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-main);
      border-radius: 0.75rem;
      border: 1px solid var(--border);
    }
    
    .p-img img {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: 8px;
    }
    
    .p-details h4 {
      font-weight: 700;
      margin-bottom: 0.25rem;
    }
    
    .p-meta {
      font-size: 0.8rem;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
    }
    
    .p-price {
      font-weight: 700;
      color: var(--primary);
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
  @Input() product!: Product;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<Invoice>();

  invoice!: Invoice;
  payFull = true;
  suggestions: any[] = [];
  showSuggestions = false;

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.invoice = {
      id: '',
      buyerName: '',
      buyerAddress: '',
      buyerPhone: '',
      productId: this.product.id,
      productName: this.product.name,
      productPrice: this.product.sellingPrice,
      amountPaid: this.product.sellingPrice,
      debt: 0,
      isFullyPaid: true,
      createdAt: new Date()
    };
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
      this.invoice.amountPaid = this.product.sellingPrice;
      this.invoice.debt = 0;
      this.invoice.isFullyPaid = true;
    } else {
      this.invoice.isFullyPaid = false;
      this.calculateDebt();
    }
  }

  calculateDebt() {
    this.invoice.debt = Math.max(0, this.product.sellingPrice - (this.invoice.amountPaid || 0));
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
