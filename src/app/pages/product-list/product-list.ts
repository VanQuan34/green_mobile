import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Product, Invoice } from '../../models/data.models';
import { Subject, debounceTime, distinctUntilChanged, Subscription } from 'rxjs';

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
            (keyup.enter)="onEnterSearch()"
          >
        </div>
        <div class="btn-group">
          <button 
            *ngIf="selectedProductsMap.size > 0"
            class="btn btn-invoice animate-scale-up" 
            (click)="createBulkInvoice()"
          >
            <span class="icon">🧾</span>
            <span>Lập hóa đơn ({{ selectedProductsMap.size }})</span>
          </button>
          <button 
            *ngIf="selectedProductsMap.size > 1"
            class="btn btn-outline animate-scale-up" 
            (click)="clearAllSelections()"
          >
            <span class="icon">✕</span>
            <span>Hủy chọn</span>
          </button>
          <button class="btn btn-primary" (click)="openProductModal()">
            <span class="icon">+</span>
            <span>Thêm sản phẩm</span>
          </button>
        </div>
      </div>

      <div class="table-container glass-card animate-fade-in" [class.loading]="loading">
        <div class="loading-overlay" *ngIf="loading">
          <div class="spinner"></div>
          <span>Đang tải dữ liệu...</span>
        </div>
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
            <tr *ngFor="let product of paginatedProducts; let i = index" (click)="viewDetail(product)" class="clickable-row">
              <td (click)="$event.stopPropagation()">
                <input type="checkbox" [checked]="selectedProductsMap.has(product.id)" (change)="toggleSelect(product)">
              </td>
              <td>{{ (currentPage - 1) * pageSize + i + 1 }}</td>
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
            <tr *ngIf="!loading && paginatedProducts.length === 0">
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

      <!-- Pagination Controls -->
      <div class="pagination-bar animate-fade-in" *ngIf="totalItems > pageSize">
        <div class="pagination-info">
          Hiển thị {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, totalItems) }} 
          trong tổng số {{ totalItems }} sản phẩm
        </div>
        <div class="pagination-controls">
          <button 
            class="btn-page" 
            [disabled]="currentPage === 1 || loading" 
            (click)="goToPage(currentPage - 1)"
          >
            ← Trước
          </button>
          
          <div class="page-numbers">
            <button 
              *ngFor="let p of pageArray" 
              class="btn-page-num" 
              [class.active]="p === currentPage"
              [disabled]="loading"
              (click)="goToPage(p)"
            >
              {{ p }}
            </button>
          </div>

          <button 
            class="btn-page" 
            [disabled]="currentPage === totalPages || loading" 
            (click)="goToPage(currentPage + 1)"
          >
            Sau →
          </button>
        </div>
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
        [loading]="modalLoading"
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
        [loading]="isSavingInvoice"
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
      position: relative;
      overflow-x: auto;
      padding: 0.5rem;
      background: white;
      min-height: 200px;
      max-height: calc(100dvh - 280px);
    }

    @media (max-width: 768px){
      .table-container {
        max-height: calc(100dvh - 360px);
      }
    }

    .table-container.loading {
      opacity: 0.7;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255,255,255,0.6);
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      color: var(--primary);
      font-weight: 500;
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
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

    /* Pagination Styles */
    .pagination-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: white;
      border-radius: 12px;
      border: 1px solid var(--border);
      flex-wrap: wrap;
      gap: 1rem;
    }

    .pagination-info {
      color: var(--text-muted);
      font-size: 0.9rem;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .page-numbers {
      display: flex;
      gap: 0.25rem;
    }

    .btn-page {
      padding: 0.5rem 1rem;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: white;
      color: var(--text-main);
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-page:hover:not(:disabled) {
      background: var(--bg-main);
      border-color: var(--primary);
      color: var(--primary);
    }

    .btn-page:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-page-num {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: white;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }

    .btn-page-num:hover {
      border-color: var(--primary);
      color: var(--primary);
    }

    .btn-page-num.active {
      background: var(--primary);
      color: white;
      border-color: var(--primary);
    }

    .btn-outline {
      padding: 0.5rem 1rem;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: white;
      color: var(--text-muted);
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.2s;
    }

    .btn-outline:hover {
      background: var(--bg-main);
      color: var(--text-main);
      border-color: var(--text-muted);
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

      .pagination-bar {
        flex-direction: column;
        text-align: center;
      }
    }
  `]
})
export class ProductListComponent implements OnInit {
  paginatedProducts: Product[] = [];
  searchQuery = '';
  showModal = false;
  showDetailModal = false;
  selectedProduct: Product = this.getEmptyProduct();
  modalLoading = false;
  loading = false;
  
  // Pagination state
  currentPage = 1;
  pageSize = 15;
  totalPages = 1;
  totalItems = 0;
  pageArray: number[] = [];
  Math = Math; // To use in template
  
  // Invoicing state
  selectedProductsMap = new Map<string, Product>();
  showInvoiceForm = false;
  showConfirmModal = false;
  selectedProductsForInvoice: Product[] = [];
  tempInvoice!: Invoice;
  isSavingInvoice = false;

  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  private lastFetchedQuery: string | null = null;

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.fetchProducts();
    
    // Setup debounce search (3s after stopped typing)
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(2000),
      distinctUntilChanged()
    ).subscribe((query) => {
      // Chỉ thực hiện search nếu chưa được gọi bởi phím Enter
      if (this.lastFetchedQuery !== query) {
        this.onEnterSearch();
      }
    });
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  fetchProducts() {
    this.loading = true;
    this.dataService.getProductsPaginated(this.currentPage, this.pageSize, this.searchQuery)
      .subscribe({
        next: (res) => {
          this.paginatedProducts = res.products;
          this.totalItems = res.total;
          this.totalPages = Math.ceil(res.total / this.pageSize) || 1;
          this.updatePageArray();
          this.loading = false;
          // Cập nhật query cuối cùng đã fetch thành công
          this.lastFetchedQuery = this.searchQuery;
          // Loại bỏ dòng clear() để giữ lựa chọn đa trang
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  updatePageArray() {
    this.pageArray = [];
    // Show around current page
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    for (let i = start; i <= end; i++) {
      this.pageArray.push(i);
    }
  }

  // Multi-select logic
  toggleSelect(product: Product) {
    if (this.selectedProductsMap.has(product.id)) {
      this.selectedProductsMap.delete(product.id);
    } else {
      this.selectedProductsMap.set(product.id, product);
    }
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.paginatedProducts.forEach(p => this.selectedProductsMap.delete(p.id));
    } else {
      this.paginatedProducts.forEach(p => this.selectedProductsMap.set(p.id, p));
    }
  }

  isAllSelected(): boolean {
    return this.paginatedProducts.length > 0 && 
           this.paginatedProducts.every(p => this.selectedProductsMap.has(p.id));
  }

  clearAllSelections() {
    this.selectedProductsMap.clear();
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
    this.searchSubject.next(this.searchQuery);
  }

  onEnterSearch() {
    this.currentPage = 1;
    this.fetchProducts();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.fetchProducts();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
    this.modalLoading = false;
    this.showModal = true;
  }

  editProduct(product: Product) {
    this.selectedProduct = { ...product };
    this.modalLoading = false;
    this.showModal = true;
  }

  onSaveProduct(product: Product) {
    this.modalLoading = true;
    const isUpdate = !!product.id;
    const operation = isUpdate
      ? this.dataService.updateProduct(product)
      : this.dataService.addProduct(product);

    operation.subscribe({
      next: (res) => {
        const updatedProduct = res.data || res;
        this.modalLoading = false;
        this.showModal = false;
        
        if (isUpdate) {
          // Cập nhật local thay vì call lại list
          this.paginatedProducts = this.paginatedProducts.map(p => 
            p.id.toString() === updatedProduct.id.toString() ? { ...p, ...updatedProduct } : p
          );
          // Cập nhật cả Map nếu đang được chọn
          if (this.selectedProductsMap.has(updatedProduct.id)) {
            this.selectedProductsMap.set(updatedProduct.id, { ...updatedProduct });
          }
        } else {
          // Sản phẩm mới thì nên fetch lại để đúng thứ tự/phân trang
          this.currentPage = 1;
          this.fetchProducts();
        }
      },
      error: () => {
        this.modalLoading = false;
      }
    });
  }

  deleteProduct(id: string) {
    if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
      this.dataService.deleteProduct(id).subscribe({
        next: () => {
          this.fetchProducts(); // Refresh current page
        }
      });
    }
  }

  createInvoice(product: Product) {
    this.selectedProductsForInvoice = [product];
    this.showInvoiceForm = true;
  }

  createBulkInvoice() {
    this.selectedProductsForInvoice = Array.from(this.selectedProductsMap.values());
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
    this.isSavingInvoice = true;
    this.dataService.addInvoice(this.tempInvoice).subscribe({
      next: () => {
        this.isSavingInvoice = false;
        this.showConfirmModal = false;
        this.selectedProductsMap.clear();
        this.fetchProducts(); // Refresh to reflect sales
        alert('Lập hóa đơn thành công!');
      },
      error: (err: any) => {
        this.isSavingInvoice = false;
        console.error('Lỗi khi lưu hóa đơn:', err);
        alert('Có lỗi xảy ra khi lưu hóa đơn. Vui lòng thử lại.');
      }
    });
  }
}
