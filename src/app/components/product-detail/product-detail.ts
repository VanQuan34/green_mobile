import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models/data.models';

@Component({
  selector: 'app-product-detail-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-overlay animate-fade-in" (click)="onClose()">
      <div class="modal-content glass-card" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <h3>Chi tiết sản phẩm</h3>
          <button class="close-btn" (click)="onClose()">✕</button>
        </header>
        
        <div class="modal-body">
          <div class="product-layout">
            <div class="product-image-side">
              <div class="image-wrapper shadow-lg">
                <img [src]="product.image || 'https://placehold.co/300x400?text=Sản phẩm'" alt="phone">
              </div>
            </div>
            
            <div class="product-info-side">
              <div class="info-group">
                <h2 class="product-title">{{ product.name }}</h2>
                <div class="badges">
                  <span class="badge capacity-badge">{{ product.capacity }}</span>
                  <span class="badge color-badge">{{ product.color }}</span>
                </div>
              </div>

              <div class="info-grid">
                <div class="info-item">
                  <label>IMEI</label>
                  <p><code>{{ product.imei }}</code></p>
                </div>
                <div class="info-item">
                  <label>Tình trạng</label>
                  <p>{{ product.status || 'Chưa có ghi chú' }}</p>
                </div>
              </div>

              <div class="price-section card">
                <div class="price-item text-muted">
                  <label>Giá gốc (Tham khảo)</label>
                  <div class="price-value-sm">{{ product.originalPrice | number }}đ</div>
                </div>
                <div class="price-item">
                  <label>Giá bán niêm yết</label>
                  <div class="price-value text-primary">{{ product.sellingPrice | number }}đ</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <div class="footer-left">
            <button class="btn btn-outline" (click)="onClose()">Đóng</button>
          </div>
          <div class="footer-actions">
            <button class="btn btn-secondary" (click)="onEdit()">
              <span>✏️</span> Sửa thông tin
            </button>
            <button class="btn btn-primary" (click)="onInvoice()">
              <span>🧾</span> Lập hóa đơn ngay
            </button>
          </div>
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
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 1rem;
    }
    
    .modal-content {
      width: 100%;
      max-width: 750px;
      max-height: 90vh;
      background: rgba(255, 255, 255, 0.95);
      display: flex;
      flex-direction: column;
      border-radius: 1.5rem;
      box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.3);
      overflow: hidden;
      animation: modalScaleDetail 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    }

    @keyframes modalScaleDetail {
      from { transform: translateY(30px) scale(0.95); opacity: 0; }
      to { transform: translateY(0) scale(1); opacity: 1; }
    }
    
    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h3 {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--text-main);
      margin: 0;
    }
    
    .close-btn {
      background: var(--bg-main);
      border: none;
      font-size: 1rem;
      color: var(--text-muted);
      cursor: pointer;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
    }

    .close-btn:hover {
      background: var(--primary-light);
      color: var(--primary-dark);
      transform: rotate(90deg);
    }
    
    .modal-body {
      padding: 2rem;
      overflow-y: auto;
    }
    
    .product-layout {
      display: grid;
      grid-template-columns: 280px 1fr;
      gap: 2.5rem;
    }
    
    .image-wrapper {
      width: 100%;
      aspect-ratio: 3/4;
      border-radius: 1rem;
      overflow: hidden;
      border: 1px solid var(--border);
      background: #f8fafc;
    }
    
    .image-wrapper img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s;
    }

    .image-wrapper:hover img {
      transform: scale(1.05);
    }
    
    .product-title {
      font-size: 2rem;
      font-weight: 800;
      margin: 0 0 1rem 0;
      letter-spacing: -0.02em;
    }
    
    .badges {
      display: flex;
      gap: 0.75rem;
      margin-bottom: 2rem;
    }
    
    .badge {
      padding: 0.5rem 1rem;
      border-radius: 100px;
      font-size: 0.85rem;
      font-weight: 700;
    }
    
    .capacity-badge {
      background: var(--primary-light);
      color: var(--primary-dark);
    }
    
    .color-badge {
      background: #f1f5f9;
      color: #475569;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    
    .info-item label {
      display: block;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }
    
    .info-item p {
      font-size: 1rem;
      font-weight: 500;
      margin: 0;
    }

    code {
      background: #f1f5f9;
      padding: 0.2rem 0.5rem;
      border-radius: 4px;
      color: var(--primary);
    }
    
    .price-section {
      background: var(--bg-main);
      padding: 1.25rem 1.5rem;
      border-radius: 1rem;
      border: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .price-item label {
      font-size: 0.8rem;
      font-weight: 600;
      display: block;
      margin-bottom: 0.25rem;
    }
    
    .price-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--primary);
    }

    .price-value-sm {
      font-size: 1.1rem;
      font-weight: 600;
    }
    
    .modal-footer {
      padding: 1.5rem;
      background: #f8fafc;
      border-top: 1px solid rgba(0,0,0,0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-actions {
      display: flex;
      gap: 1rem;
    }

    .btn-secondary {
      background: white;
      color: var(--text-main);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: #f1f5f9;
      border-color: #cbd5e1;
    }

    @media (max-width: 768px) {
      .product-layout {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
      
      .product-image-side {
        max-width: 200px;
        margin: 0 auto;
      }

      .product-title {
        font-size: 1.5rem;
      }

      .modal-content {
        max-height: 95vh;
      }

      .modal-footer {
        flex-direction: column-reverse;
        gap: 1rem;
      }

      .footer-actions {
        width: 100%;
        flex-direction: column;
      }

      .footer-actions button, .footer-left button {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class ProductDetailModalComponent implements OnInit, OnDestroy {
  @Input() product!: Product;
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<Product>();
  @Output() invoice = new EventEmitter<Product>();

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit() {
    this.renderer.appendChild(document.body, this.el.nativeElement);
  }

  ngOnDestroy() {
    this.renderer.removeChild(document.body, this.el.nativeElement);
  }

  onClose() {
    this.close.emit();
  }

  onEdit() {
    this.edit.emit(this.product);
  }

  onInvoice() {
    this.invoice.emit(this.product);
  }
}
