import { Component, EventEmitter, Input, OnInit, OnDestroy, Output, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product, Invoice } from '../../models/data.models';
import { DataService } from '../../services/data.service';
import { PhoneCleanerPipe } from '../../pipes/phone-cleaner.pipe';


@Component({
  selector: 'app-invoice-form-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, PhoneCleanerPipe],

  template: `
    <div class="modal-overlay animate-fade-in">
      <div class="modal-content glass-card">
        <header class="modal-header">
          <h3>{{ editInvoice ? 'Chỉnh sửa hóa đơn' : 'Lập hóa đơn bán hàng' }}</h3>
          <button class="close-btn" (click)="onClose()">✕</button>
        </header>

        <div class="modal-body">
          <!-- Multi-Product Info Summary -->
          <div class="products-container" *ngIf="products.length > 0">
            <label class="section-label">Sản phẩm đã chọn ({{ products.length }})</label>
            <div class="product-list-mini">
              <div class="product-item-mini animate-fade-in" *ngFor="let p of products; let idx = index">
                <div class="p-img">
                  <img [src]="p.image || 'https://placehold.co/40x40?text=Phone'" alt="phone">
                </div>
                <div class="p-info">
                  <div class="p-main-info">
                    <span class="p-name">{{ p.name }}</span>
                    <span class="p-specs">{{ p.capacity }} | {{ p.color }}</span>
                  </div>
                  <div class="p-actions-mini">
                    <span class="p-price">{{ p.sellingPrice | number }}đ</span>
                    <button class="btn-remove-p" (click)="removeProduct(idx)" title="Xóa khỏi hóa đơn">✕</button>
                  </div>
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
                #buyerName="ngModel"
                placeholder="Nhập tên khách hàng..." 
                (input)="onCustomerSearch()"
                required
                autocomplete="off"
                [disabled]="!!editInvoice"
              >
              <div class="error-text animate-fade-in" *ngIf="buyerName.invalid && (buyerName.dirty || buyerName.touched)">
                Vui lòng nhập tên khách hàng
              </div>
              <div class="autocomplete-dropdown glass-card" *ngIf="showSuggestions && suggestions.length > 0">
                <div 
                  class="suggestion-item" 
                  *ngFor="let s of suggestions" 
                  (click)="selectCustomer(s)"
                >
                  <div class="s-info">
                    <span class="s-name">{{ s.name }}</span>
                    <span class="s-phone">{{ s.phone | phoneCleaner }}</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group">
              <label class="required">Số điện thoại</label>
              <input type="text" [(ngModel)]="invoice.buyerPhone" name="buyerPhone" #buyerPhone="ngModel" placeholder="0xxx..." required [disabled]="!!editInvoice">
              <div class="error-text animate-fade-in" *ngIf="buyerPhone.invalid && (buyerPhone.dirty || buyerPhone.touched)">
                Vui lòng nhập số điện thoại
              </div>
            </div>

            <div class="form-group">
              <label class="required">Địa chỉ</label>
              <input type="text" [(ngModel)]="invoice.buyerAddress" name="buyerAddress" #buyerAddress="ngModel" placeholder="Địa chỉ giao hàng/liên hệ..." required [disabled]="!!editInvoice">
              <div class="error-text animate-fade-in" *ngIf="buyerAddress.invalid && (buyerAddress.dirty || buyerAddress.touched)">
                Vui lòng nhập địa chỉ khách hàng
              </div>
            </div>

            <div class="payment-section" *ngIf="products.length > 0">
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
                  #amountPaid="ngModel"
                  required
                >
                <div class="error-text animate-fade-in" *ngIf="amountPaid.invalid && (amountPaid.dirty || amountPaid.touched)">
                  Vui lòng nhập số tiền thanh toán
                </div>
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

            <!-- External Debt Adjustment -->
            <div class="payment-section external-debt-info" *ngIf="products.length === 0">
              <div class="form-group animate-fade-in">
                <label class="required">Số tiền nợ còn lại (đ)</label>
                <input 
                  type="text" 
                  [ngModel]="formatPrice(invoice.debt)" 
                  (ngModelChange)="onDebtChange($event)"
                  name="debt" 
                  #debtField="ngModel"
                  required
                >
                <div class="error-text animate-fade-in" *ngIf="debtField.invalid && (debtField.dirty || debtField.touched)">
                  Vui lòng nhập số tiền nợ
                </div>
                <span class="price-words" *ngIf="invoice.debt > 0">
                  {{ getPriceWords(invoice.debt) }}
                </span>
                <div class="info-msg">
                  💡 Đối với nợ cũ/nợ ngoài, bạn hãy điều chỉnh trực tiếp số tiền nợ.
                </div>
              </div>
            </div>
          </form>
        </div>

        <footer class="modal-footer">
          <button class="btn btn-outline" (click)="onClose()" [disabled]="isSaving">Hủy bỏ</button>
          <button class="btn btn-primary" (click)="onSubmit(invoiceForm)" [disabled]="isSaving">
            <span class="spinner" *ngIf="isSaving"></span>
            {{ isSaving ? 'Đang xử lý...' : 'Tiếp tục (Xác nhận)' }}
          </button>
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

    .product-item-mini .p-specs {
      font-size: 0.7rem;
      color: var(--text-muted);
      display: block;
      margin-top: -1px;
    }

    .product-item-mini .p-price {
      font-weight: 700;
      color: var(--primary);
    }

    .p-actions-mini {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-remove-p {
      background: #fee2e2;
      color: #ef4444;
      border: none;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      font-size: 0.65rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-remove-p:hover {
      background: #ef4444;
      color: white;
      transform: scale(1.1);
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
    
    .error-text {
      color: #dc2626;
      font-size: 0.7rem;
      margin-top: 0.2rem;
      display: block;
      font-weight: 600;
    }

    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 0.6s linear infinite;
      display: inline-block;
      margin-right: 0.5rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .info-msg {
      font-size: 0.75rem;
      color: #0369a1;
      background: #f0f9ff;
      padding: 0.5rem;
      border-radius: 4px;
      margin-top: 0.5rem;
    }

    input.ng-invalid.ng-touched {
      border-color: #ef4444 !important;
      background: #fffcfc;
    }

    input:disabled {
      background: #f3f4f6;
      cursor: not-allowed;
      color: var(--text-muted);
      opacity: 0.8;
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
export class InvoiceFormModalComponent implements OnInit, OnDestroy {
  @Input() products: Product[] = [];
  @Input() editInvoice?: Invoice;
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<Invoice>();

  isSaving = false;
  invoice!: Invoice;
  payFull = true;
  suggestions: any[] = [];
  showSuggestions = false;

  constructor(private dataService: DataService, private el: ElementRef, private renderer: Renderer2) { }

  ngOnInit() {
    this.renderer.appendChild(document.body, this.el.nativeElement);
    
    if (this.editInvoice) {
      this.invoice = JSON.parse(JSON.stringify(this.editInvoice));
      this.products = [...(this.invoice.products || [])];
      this.payFull = this.invoice.isFullyPaid;

      // Đảm bảo totalAmount luôn chính xác cho các hóa đơn nợ nhập ngoài/manual
      if (this.products.length === 0 && (!this.invoice.totalAmount || this.invoice.totalAmount === 0)) {
        this.invoice.totalAmount = (this.invoice.debt || 0) + (this.invoice.amountPaid || 0);
      }
    } else {
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
        createdAt: new Date().toISOString()
      };
    }
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

  onDebtChange(val: string) {
    const num = this.parsePrice(val);
    this.invoice.debt = num;
    this.invoice.isFullyPaid = num === 0;
    
    // For external debt, totalAmount is just the debt (if amountPaid is 0)
    if (this.products.length === 0) {
      this.invoice.totalAmount = num + (this.invoice.amountPaid || 0);
    }
  }

  calculateDebt() {
    if (this.products.length === 0) return;
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

  removeProduct(index: number) {
    if (this.products.length <= 1) {
      this.onClose();
      return;
    }
    this.products.splice(index, 1);
    const newTotal = this.products.reduce((sum, p) => sum + p.sellingPrice, 0);
    this.invoice.totalAmount = newTotal;

    if (this.payFull) {
      this.invoice.amountPaid = newTotal;
    }
    this.calculateDebt();
  }

  selectCustomer(customer: any) {
    this.invoice.buyer_id = customer.id || customer.buyer_id;
    this.invoice.buyerName = customer.name;
    this.invoice.buyerPhone = customer.phone?.split('_ex_')[0] || '';

    this.invoice.buyerAddress = customer.address;
    if (customer.email) this.invoice.buyer_email = customer.email;
    this.showSuggestions = false;
  }

  onClose() {
    this.close.emit();
  }

  onSubmit(form: any) {
    if (form.invalid) {
      Object.keys(form.controls).forEach(key => {
        form.controls[key].markAsTouched();
      });
      return;
    }
    this.isSaving = true;
    this.confirm.emit(this.invoice);
  }

  ngOnDestroy() {
    this.renderer.removeChild(document.body, this.el.nativeElement);
  }
}
