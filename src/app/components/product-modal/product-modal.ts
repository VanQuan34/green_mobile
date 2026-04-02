import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../models/data.models';
import { DataService } from '../../services/data.service';

@Component({
  selector: 'app-product-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay animate-fade-in" (click)="onClose()">
      <div class="modal-content glass-card" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h3>{{ product.id ? 'Cập nhật' : 'Thêm' }} sản phẩm</h3>
          <button class="close-btn" (click)="onClose()">✕</button>
        </header>
        
        <div class="modal-body">
          <form #productForm="ngForm" class="product-form">
            <div class="form-row">
              <div class="form-group flex-2">
                <label class="required">Tên điện thoại</label>
                <input type="text" [(ngModel)]="product.name" name="name" placeholder="Ví dụ: iPhone 15 Pro Max" required>
              </div>
              <div class="form-group flex-2">
                <label class="required">IMEI</label>
                <input type="text" [(ngModel)]="product.imei" name="imei" placeholder="Nhập IMEI..." required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="required">Dung lượng</label>
                <select [(ngModel)]="product.capacity" name="capacity" required>
                  <option *ngFor="let cap of capacities" [value]="cap">{{ cap }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="required">Màu sắc</label>
                <input type="text" [(ngModel)]="product.color" name="color" placeholder="Ví dụ: Titan Tự Nhiên" required>
              </div>
            </div>

            <div class="form-group">
              <label>Link ảnh sản phẩm (URL)</label>
              <div class="img-input-container">
                <input type="text" [(ngModel)]="product.image" name="image" placeholder="https://...">
                <div class="img-preview" *ngIf="product.image">
                  <img [src]="product.image" alt="preview">
                </div>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="required">Giá gốc (đ)</label>
                <input 
                  type="text" 
                  [ngModel]="formatPrice(product.originalPrice)" 
                  (ngModelChange)="product.originalPrice = parsePrice($event)"
                  name="originalPrice" 
                  required
                  placeholder="0"
                >
                <span class="price-words" *ngIf="product.originalPrice > 0">
                  {{ getPriceWords(product.originalPrice) }}
                </span>
              </div>
              <div class="form-group">
                <label class="required">Giá bán (đ)</label>
                <input 
                  type="text" 
                  [ngModel]="formatPrice(product.sellingPrice)" 
                  (ngModelChange)="product.sellingPrice = parsePrice($event)"
                  name="sellingPrice" 
                  required
                  placeholder="0"
                >
                <span class="price-words" *ngIf="product.sellingPrice > 0">
                  {{ getPriceWords(product.sellingPrice) }}
                </span>
                <span class="price-warning" *ngIf="product.originalPrice > 0 && product.sellingPrice > 0 && product.sellingPrice < product.originalPrice">
                  ⚠️ Giá bán đang thấp hơn giá gốc!
                </span>
              </div>
            </div>

            <div class="form-group">
              <label>Tình trạng / Ghi chú</label>
              <textarea [(ngModel)]="product.status" name="status" rows="3" placeholder="Mới 99%, pin 100%, bảo hành..."></textarea>
            </div>
          </form>
        </div>

        <footer class="modal-footer">
          <button class="btn btn-outline" (click)="onClose()" [disabled]="loading">Hủy bỏ</button>
          <button class="btn btn-primary" (click)="onSave()" [disabled]="!productForm.valid || loading">
            <span class="spinner" *ngIf="loading"></span>
            {{ loading ? (product.id ? 'Đang cập nhật...' : 'Đang thêm...') : (product.id ? 'Cập nhật' : 'Thêm mới') }}
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
      max-width: 600px;
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
    
    .modal-header h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-main);
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
    }
    
    .product-form {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    
    .form-row {
      display: flex;
      gap: 1rem;
    }
    
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      flex: 1;
    }
    
    .flex-2 { flex: 2; }
    
    label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-main);
    }
    
    .img-input-container {
      display: flex;
      gap: 1rem;
      align-items: center;
    }
    
    .img-preview {
      width: 50px;
      height: 50px;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);
      flex-shrink: 0;
    }
    
    .img-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    textarea {
      resize: vertical;
    }

    .price-words {
      font-size: 0.75rem;
      color: var(--primary);
      font-style: italic;
      margin-top: -0.25rem;
    }

    .price-warning {
      font-size: 0.75rem;
      color: var(--red);
      font-weight: 600;
      margin-top: 0.1rem;
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
    
    .modal-footer {
      padding: 1.25rem 1.5rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
    }

    @media (max-width: 768px) {
      .form-row {
        flex-direction: column;
      }
      
      .img-input-container {
        flex-direction: column;
        align-items: flex-start;
      }

      .modal-footer {
        flex-direction: column-reverse;
      }

      .modal-footer button {
        width: 100%;
        justify-content: center;
      }

      .modal-content {
        max-height: 95vh;
        border-radius: 1rem;
      }
    }
  `]
})
export class ProductModalComponent implements OnInit, OnDestroy {
  @Input() product: Product = this.getEmptyProduct();
  @Input() loading = false;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Product>();

  capacities = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];

  constructor(private dataService: DataService, private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    this.renderer.appendChild(document.body, this.el.nativeElement);
  }

  ngOnDestroy() {
    this.renderer.removeChild(document.body, this.el.nativeElement);
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

  private getEmptyProduct(): Product {
    return {
      id: '',
      name: '',
      imei: '',
      image: '',
      capacity: '128GB',
      color: '',
      status: '',
      originalPrice: 0,
      sellingPrice: 0
    };
  }

  onClose() {
    this.close.emit();
  }

  onSave() {
    this.save.emit(this.product);
  }
}
