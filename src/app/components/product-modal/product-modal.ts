import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Product } from '../../models/data.models';

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
                <label>Tên điện thoại</label>
                <input type="text" [(ngModel)]="product.name" name="name" placeholder="Ví dụ: iPhone 15 Pro Max" required>
              </div>
              <div class="form-group flex-1">
                <label>IMEI</label>
                <input type="text" [(ngModel)]="product.imei" name="imei" placeholder="Nhập IMEI..." required>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Dung lượng</label>
                <select [(ngModel)]="product.capacity" name="capacity" required>
                  <option *ngFor="let cap of capacities" [value]="cap">{{ cap }}</option>
                </select>
              </div>
              <div class="form-group">
                <label>Màu sắc</label>
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
                <label>Giá gốc (đ)</label>
                <input type="number" [(ngModel)]="product.originalPrice" name="originalPrice" required>
              </div>
              <div class="form-group">
                <label>Giá bán (đ)</label>
                <input type="number" [(ngModel)]="product.sellingPrice" name="sellingPrice" required>
              </div>
            </div>

            <div class="form-group">
              <label>Tình trạng / Ghi chú</label>
              <textarea [(ngModel)]="product.status" name="status" rows="3" placeholder="Mới 99%, pin 100%, bảo hành..."></textarea>
            </div>
          </form>
        </div>

        <footer class="modal-footer">
          <button class="btn btn-outline" (click)="onClose()">Hủy bỏ</button>
          <button class="btn btn-primary" (click)="onSave()" [disabled]="!productForm.valid">
            {{ product.id ? 'Cập nhật' : 'Thêm mới' }}
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
      z-index: 1000;
      padding: 1rem;
    }
    
    .modal-content {
      width: 100%;
      max-width: 600px;
      background: white;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
      box-shadow: var(--shadow-lg);
    }
    
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .modal-header h3 {
      font-size: 1.1rem;
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
      transition: background 0.2s;
    }
    
    .close-btn:hover {
      background: var(--primary-light);
      color: var(--primary-dark);
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
    
    .modal-footer {
      padding: 1.25rem 1.5rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
    }
  `]
})
export class ProductModalComponent {
  @Input() product: Product = this.getEmptyProduct();
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<Product>();

  capacities = ['16GB', '32GB', '64GB', '128GB', '256GB', '512GB', '1TB', '2TB'];

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
