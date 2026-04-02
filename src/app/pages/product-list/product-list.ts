import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Product, Invoice } from '../../models/data.models';

import { ProductModalComponent } from '../../components/product-modal/product-modal';
import { InvoiceFormModalComponent } from '../../components/invoice-form-modal/invoice-form-modal';
import { InvoiceConfirmModalComponent } from '../../components/invoice-confirm-modal/invoice-confirm-modal';
import { ProductDetailModalComponent } from '../../components/product-detail/product-detail';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ProductModalComponent,
    InvoiceFormModalComponent,
    InvoiceConfirmModalComponent,
    ProductDetailModalComponent
  ],
  template: `
    <div class="product-page">
      <div class="action-bar animate-fade-in">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Tìm kiếm tên, IMEI..." 
            (input)="onSearch()"
          >
        </div>
        <div class="btn-group">
          <button 
            *ngIf="selectedProductIds.size > 0"
            class="btn btn-invoice animate-scale-up" 
            (click)="createBulkInvoice()"
          >
            <span class="icon">🧾</span>
            <span>Lập hóa đơn ({{ selectedProductIds.size }})</span>
          </button>
          <button class="btn btn-primary" (click)="openProductModal()">
            <span class="icon">➕</span>
            <span>Thêm sản phẩm</span>
          </button>
        </div>
      </div>

      <div class="table-container glass-card animate-fade-in">
        <table>
          <thead>
            <tr>
              <th>
                <input type="checkbox" [checked]="isAllSelected()" (change)="toggleSelectAll()">
              </th>
              <th>STT</th>
              <th>Hình ảnh</th>
              <th>Tên sản phẩm</th>
              <th>IMEI</th>
              <th>Dung lượng</th>
              <th>Màu</th>
              <th>Tình trạng</th>
              <th>Giá gốc</th>
              <th>Giá bán</th>
              <th class="actions-header">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let product of filteredProducts; let i = index" (click)="viewDetail(product)" class="clickable-row">
              <td (click)="$event.stopPropagation()">
                <input type="checkbox" [checked]="selectedProductIds.has(product.id)" (change)="toggleSelect(product.id)">
              </td>
              <td>{{ i + 1 }}</td>
              <td>
                <div class="product-img">
                  <img [src]="product.image || 'https://placehold.co/40x40?text=Phone'" alt="phone">
                </div>
              </td>
              <td class="font-bold">{{ product.name }}</td>
              <td><code>{{ product.imei }}</code></td>
              <td><span class="badge">{{ product.capacity }}</span></td>
              <td>{{ product.color }}</td>
              <td class="status-cell">{{ product.status }}</td>
              <td class="text-muted">{{ product.originalPrice | number }}đ</td>
              <td class="font-bold text-primary">{{ product.sellingPrice | number }}đ</td>
              <td class="actions-cell">
                <div class="btn-group" (click)="$event.stopPropagation()">
                  <button class="btn-icon btn-edit tooltip-left" data-tooltip="Sửa" (click)="editProduct(product)">✏️</button>
                  <button class="btn-icon btn-delete tooltip-left" data-tooltip="Xóa" (click)="deleteProduct(product.id)">🗑️</button>
                  <button class="btn-icon btn-invoice tooltip-left" data-tooltip="Lập hóa đơn" (click)="createInvoice(product)">🧾</button>
                </div>
              </td>
            </tr>
            <tr *ngIf="filteredProducts.length === 0">
              <td colspan="11" class="empty-state">
                <div class="empty-msg">
                  <span>📭</span>
                  <p>Không tìm thấy sản phẩm nào.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <app-product-detail-modal
        *ngIf="showDetailModal"
        [product]="selectedProduct"
        (close)="showDetailModal = false"
        (edit)="onEditFromDetail($event)"
        (invoice)="onInvoiceFromDetail($event)"
      ></app-product-detail-modal>

      <app-product-modal 
        *ngIf="showModal" 
        [product]="selectedProduct" 
        (close)="showModal = false" 
        (save)="onSaveProduct($event)"
      ></app-product-modal>

      <app-invoice-form-modal
        *ngIf="showInvoiceForm"
        [products]="selectedProductsForInvoice"
        (close)="showInvoiceForm = false"
        (confirm)="onConfirmInvoice($event)"
      ></app-invoice-form-modal>

      <app-invoice-confirm-modal
        *ngIf="showConfirmModal"
        [invoice]="tempInvoice"
        (back)="onBackToForm()"
        (confirm)="onFinalSubmit()"
      ></app-invoice-confirm-modal>
    </div>
  `,
  styles: [`
    .product-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .clickable-row {
      cursor: pointer;
      transition: background 0.2s;
    }

    .clickable-row:hover {
      background: #f8fafc;
    }
    
    .action-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
    }
    
    .search-box {
      position: relative;
      flex: 1;
      max-width: 400px;
    }
    
    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    
    .search-box input {
      width: 100%;
      padding-left: 2.75rem;
      background-color: white;
      border: 1px solid var(--border);
    }
    
    .table-container {
      overflow-x: auto;
      padding: 0.5rem;
      background: white;
    }
    
    .product-img img {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      object-fit: cover;
      border: 1px solid var(--border);
    }
    
    .font-bold {
      font-weight: 600;
    }
    
    .text-primary {
      color: var(--primary);
    }
    
    .badge {
      padding: 0.25rem 0.5rem;
      background: var(--primary-light);
      color: var(--primary-dark);
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .status-cell {
      max-width: 150px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-muted);
      font-size: 0.85rem;
    }
    
    .actions-header {
      text-align: right;
      padding-right: 2rem;
    }
    
    .actions-cell {
      text-align: right;
    }
    
    .btn-group {
      display: inline-flex;
      gap: 0.5rem;
    }
    
    .btn-icon {
      width: 32px;
      height: 32px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      font-size: 0.9rem;
    }
    
    .btn-icon:hover {
      background: var(--bg-main);
      transform: scale(1.1);
    }
    
    .btn-delete:hover {
      border-color: var(--red);
      background-color: var(--red-light);
    }
    
    .btn-invoice:hover {
      border-color: var(--primary);
      background-color: var(--primary-light);
    }
    
    .empty-state {
      padding: 4rem !important;
      text-align: center;
    }
    
    .empty-msg {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      color: var(--text-muted);
    }
    
    .empty-msg span {
      font-size: 3rem;
    }

    @media (max-width: 768px) {
      .action-bar {
        flex-direction: column;
        align-items: stretch;
      }
      
      .search-box {
        max-width: none;
      }
      
      .btn-primary {
        justify-content: center;
      }

      .table-container {
        margin: 0 -0.5rem;
        border-radius: 0;
      }
    }
  `]
})
export class ProductListComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  searchQuery = '';
  showModal = false;
  showDetailModal = false;
  selectedProduct: Product = this.getEmptyProduct();
  
  // Invoicing state
  selectedProductIds = new Set<string>();
  showInvoiceForm = false;
  showConfirmModal = false;
  selectedProductsForInvoice: Product[] = [];
  tempInvoice!: Invoice;

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.dataService.products$.subscribe(data => {
      this.products = data;
      this.onSearch();
      // Clear selection if products change significantly
      this.selectedProductIds.clear();
    });
  }

  // Multi-select logic
  toggleSelect(id: string) {
    if (this.selectedProductIds.has(id)) {
      this.selectedProductIds.delete(id);
    } else {
      this.selectedProductIds.add(id);
    }
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.selectedProductIds.clear();
    } else {
      this.filteredProducts.forEach(p => this.selectedProductIds.add(p.id));
    }
  }

  isAllSelected(): boolean {
    return this.filteredProducts.length > 0 && 
           this.filteredProducts.every(p => this.selectedProductIds.has(p.id));
  }

  viewDetail(product: Product) {
    this.selectedProduct = { ...product };
    this.showDetailModal = true;
  }

  onEditFromDetail(product: Product) {
    this.showDetailModal = false;
    this.editProduct(product);
  }

  onInvoiceFromDetail(product: Product) {
    this.showDetailModal = false;
    this.createInvoice(product);
  }

  onSearch() {
    const q = this.searchQuery.toLowerCase();
    this.filteredProducts = this.products.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.imei.toLowerCase().includes(q) ||
      p.color.toLowerCase().includes(q)
    );
  }

  getEmptyProduct(): Product {
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

  openProductModal() {
    this.selectedProduct = this.getEmptyProduct();
    this.showModal = true;
  }

  editProduct(product: Product) {
    this.selectedProduct = { ...product };
    this.showModal = true;
  }

  onSaveProduct(product: Product) {
    if (product.id) {
      this.dataService.updateProduct(product);
    } else {
      this.dataService.addProduct(product);
    }
    this.showModal = false;
  }

  deleteProduct(id: string) {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      this.dataService.deleteProduct(id);
    }
  }

  createInvoice(product: Product) {
    this.selectedProductsForInvoice = [product];
    this.showInvoiceForm = true;
  }

  createBulkInvoice() {
    this.selectedProductsForInvoice = this.products.filter(p => this.selectedProductIds.has(p.id));
    if (this.selectedProductsForInvoice.length > 0) {
      this.showInvoiceForm = true;
    }
  }

  onConfirmInvoice(invoice: Invoice) {
    this.tempInvoice = invoice;
    this.showInvoiceForm = false;
    this.showConfirmModal = true;
  }

  onBackToForm() {
    this.showConfirmModal = false;
    this.showInvoiceForm = true;
  }

  onFinalSubmit() {
    this.dataService.addInvoice(this.tempInvoice);
    this.showConfirmModal = false;
    this.selectedProductIds.clear();
    alert('Lập hóa đơn thành công!');
  }
}
