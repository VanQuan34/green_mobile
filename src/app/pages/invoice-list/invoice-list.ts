import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Invoice } from '../../models/data.models';
import { InvoiceDetailModalComponent } from '../../components/invoice-detail-modal/invoice-detail-modal';
import { InvoiceFormModalComponent } from '../../components/invoice-form-modal/invoice-form-modal';
import { ExportInvoiceModalComponent } from '../../components/export-invoice-modal/export-invoice-modal';
import { PasswordModalComponent } from '../../components/password-modal/password-modal';
import { Subject, debounceTime, distinctUntilChanged, Subscription } from 'rxjs';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule, FormsModule, InvoiceDetailModalComponent, InvoiceFormModalComponent, ExportInvoiceModalComponent, PasswordModalComponent],
  template: `
    <div class="invoice-page animate-fade-in">
      <div class="list-header">
        <div class="search-bar glass-card">
          <span class="icon"><i class="ri-search-line"></i></span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Tìm theo tên khách, số điện thoại hoặc sản phẩm..."
            (input)="onSearch()"
            (keyup.enter)="onEnterSearch()"
          >
        </div>
        <div class="header-actions">
          <div class="sort-controls glass-card">
            <label>Sắp xếp:</label>
            <select [(ngModel)]="sortOrder" (change)="onSortChange()">
              <option value="date_desc">Mới nhất (Mặc định)</option>
              <option value="date_asc">Cũ nhất</option>
              <option value="debt_desc">Nợ cao → thấp</option>
              <option value="debt_asc">Nợ thấp → cao</option>
            </select>
          </div>

          <button class="btn-export glass-card" (click)="exportToExcel()" title="Xuất danh sách ra Excel">
            <i class="ri-file-excel-2-line ri-v-adjust"></i>
            <span class="btn-text">Xuất Excel</span>
          </button>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tabs-container glass-card">
        <button class="tab-item" [class.active]="activeTab === 'all'" (click)="setTab('all')">
          <i class="ri-file-list-3-line tab-icon"></i> Tất cả
          <span class="tab-count">{{ totalAll }}</span>
        </button>
        <button class="tab-item" [class.active]="activeTab === 'paid'" (click)="setTab('paid')">
          <i class="ri-checkbox-circle-line tab-icon"></i> Đã thanh toán
          <span class="tab-count">{{ totalPaid }}</span>
        </button>
        <button class="tab-item" [class.active]="activeTab === 'debt'" (click)="setTab('debt')">
          <i class="ri-time-line tab-icon"></i> Còn nợ
          <span class="tab-count">{{ totalDebt }}</span>
        </button>
      </div>

      <div class="table-container glass-card" #tableContainer (scroll)="onTableScroll($event)" [class.is-loading]="loading">
        <!-- Loading overlay: lần đầu hoặc khi đổi tab/search -->
        <div class="loading-overlay" *ngIf="loading">
          <div class="spinner"></div>
          <span>{{ filteredInvoices.length > 0 ? 'Đang cập nhật...' : 'Đang tải dữ liệu...' }}</span>
        </div>

        <table>
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Sản phẩm</th>
              <th>Đã trả</th>
              <th>Còn nợ</th>
              <th>Ngày lập</th>
              <th class="actions-header">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let invoice of filteredInvoices" 
                (click)="viewInvoiceDetail(invoice)"
                [ngClass]="{'debt-row': !invoice.isFullyPaid, 'paid-row': invoice.isFullyPaid, 'clickable-row': true}">
              <td>
                <div class="customer-info">
                  <span class="name">{{ invoice.buyerName }}</span>
                  <span class="phone text-muted">{{ invoice.buyerPhone }}</span>
                </div>
              </td>
              <td>
                <div class="product-info">
                  <ng-container *ngIf="invoice.products && invoice.products.length > 0; else legacyProduct">
                    <div class="p-item-tag" *ngFor="let p of invoice.products.slice(0, 2)">
                      <span class="p-name">{{ p.name }}</span>
                      <span class="p-price text-muted">{{ (p.sellingPrice || 0) | number }}đ</span>
                    </div>
                    <div class="more-products" *ngIf="invoice.products.length > 2">
                      ... và {{ invoice.products.length - 2 }} sản phẩm khác
                    </div>
                  </ng-container>
                  <ng-template #legacyProduct>
                    <div class="p-item-tag">
                      <span class="p-name">{{ invoice.productName }}</span>
                      <span class="p-price text-muted">{{ (invoice.productPrice || 0) | number }}đ</span>
                    </div>
                  </ng-template>
                </div>
              </td>
              <td class="font-bold">{{ (invoice.amountPaid || 0) | number }}đ</td>
              <td>
                <span class="debt-amount" [class.has-debt]="invoice.debt > 0">
                  {{ (invoice.debt || 0) | number }}đ
                </span>
              </td>
              <td class="text-muted">{{ invoice.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
              <td class="actions-cell">
                <div class="btn-group" (click)="$event.stopPropagation()">
                  <button class="btn-icon ri-v-adjust" title="Cập nhật" (click)="updateInvoice(invoice)">
                    <i class="ri-edit-line"></i>
                  </button>
                  <button class="btn-icon btn-delete ri-v-adjust" title="Xóa" (click)="deleteInvoice(invoice)">
                    <i class="ri-delete-bin-line"></i>
                  </button>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr *ngIf="!loading && filteredInvoices.length === 0">
              <td colspan="6" class="empty-state">
                <div class="empty-msg">
                  <i class="ri-file-list-3-line" style="font-size: 3rem; opacity: 0.5;"></i>
                  <p>Không có hóa đơn nào phù hợp với bộ lọc.</p>
                </div>
              </td>
            </tr>

            <!-- Loading More Indicator -->
            <tr *ngIf="loadingMore">
              <td colspan="6" class="loading-more-cell">
                <div class="loading-more">
                  <div class="spinner-small"></div>
                  <span>Đang tải thêm...</span>
                </div>
              </td>
            </tr>

            <!-- End of List Indicator -->
            <tr *ngIf="!hasMore && filteredInvoices.length > 0 && !loading">
              <td colspan="6" class="end-of-list">
                <span>Đã hiển thị tất cả {{ filteredInvoices.length }} hóa đơn</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Detail Modal -->
      <app-invoice-detail-modal 
        *ngIf="selectedInvoice" 
        [invoice]="selectedInvoice" 
        (close)="selectedInvoice = null">
      </app-invoice-detail-modal>

      <!-- Edit Modal -->
      <app-invoice-form-modal
        *ngIf="editingInvoice"
        [editInvoice]="editingInvoice"
        (close)="editingInvoice = null"
        (confirm)="onEditConfirm($event)">
      </app-invoice-form-modal>

      <!-- Export Modal -->
      <app-export-invoice-modal
        *ngIf="showExportModal"
        (close)="showExportModal = false">
      </app-export-invoice-modal>

      <!-- Password Modal -->
      <app-password-modal
        *ngIf="showPasswordModal"
        [invoice]="selectedDeleteInvoice!"
        (close)="showPasswordModal = false"
        (deleted)="onDeleteSuccess()">
      </app-password-modal>
    </div>
  `,
  styles: [`
    .invoice-page {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .list-header {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
      flex-wrap: wrap;
    }

    .header-actions {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .search-bar {
      flex: 1;
      display: flex;
      align-items: center;
      padding: 0.75rem 1rem;
      gap: 0.75rem;
    }

    .search-bar input {
      border: none;
      background: none;
      width: 100%;
      outline: none;
      font-size: 0.95rem;
      color: var(--text-main);
    }

    /* Tabs Style */
    .tabs-container {
      display: flex;
      padding: 0.5rem;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 12px;
    }

    .tab-item {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      color: var(--text-muted);
      font-weight: 500;
      transition: all 0.2s ease;
      font-size: 0.9rem;
    }

    .tab-item:hover {
      background: rgba(255, 255, 255, 0.8);
      color: var(--text-main);
    }

    .tab-item.active {
      background: var(--primary);
      color: white;
      box-shadow: var(--shadow-lg);
      font-weight: 700;
    }

    .tab-count {
      background: rgba(0, 0, 0, 0.05);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .tab-item.active .tab-count {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    @media (max-width: 600px) {
      .tabs-container {
        flex-direction: column;
      }
    }

    .sort-controls {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem;
    }

    .sort-controls label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .sort-controls select {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.4rem 0.6rem;
      font-size: 0.9rem;
      background: white;
      outline: none;
      cursor: pointer;
    }

    .btn-export {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border: 1px solid var(--border);
      background: white;
      color: var(--text-main);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-export:hover {
      background: var(--blue-light);
      border-color: var(--blue);
      transform: translateY(-2px);
      box-shadow: var(--shadow);
    }

    .btn-export span:first-child {
      font-size: 1.2rem;
    }

    @media (max-width: 768px) {
      .btn-text {
        display: none;
      }
      .btn-export {
        padding: 0.75rem;
      }
    }
    
    .table-container {
      overflow-x: auto;
      overflow-y: auto;
      max-height: calc(100dvh - 290px);
      position: relative;
      min-height: 200px;
    }

    @media (max-width: 768px) {
      .table-container {
        max-height: calc(100dvh - 380px);
      }
    }

    .table-container.is-loading {
      opacity: 0.7;
    }

    /* Loading Overlay (lần đầu) */
    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255,255,255,0.7);
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

    /* Loading More (cuộn thêm) */
    .loading-more-cell {
      padding: 1.5rem !important;
    }

    .loading-more {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      color: var(--primary);
      font-weight: 500;
      font-size: 0.9rem;
      padding: 0.5rem;
    }

    .spinner-small {
      width: 22px;
      height: 22px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid var(--primary);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    /* End of list */
    .end-of-list {
      text-align: center;
      padding: 1rem !important;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 500;
    }

    .clickable-row {
      cursor: pointer;
      transition: all 0.2s;
    }

    .clickable-row:hover td {
      background-color: rgba(0,0,0,0.02) !important;
    }
    
    .customer-info, .product-info {
      display: flex;
      flex-direction: column;
    }
    
    .name, .p-name {
      font-weight: 600;
      color: var(--text-main);
    }
    
    .phone, .p-price {
      font-size: 0.75rem;
    }
    
    .p-item-tag {
      display: flex;
      flex-direction: column;
      margin-bottom: 0.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px dashed rgba(0,0,0,0.05);
    }
    
    .p-item-tag:last-child {
      margin-bottom: 0;
      padding-bottom: 0;
      border-bottom: none;
    }
    
    .debt-amount {
      font-weight: 600;
      color: var(--green);
    }
    
    .debt-amount.has-debt {
      color: var(--red);
    }
    
    .debt-row td {
      background-color: var(--red-light);
      border-color: rgba(239, 68, 68, 0.1);
    }
    
    .paid-row td {
      background-color: var(--green-light);
      border-color: rgba(34, 197, 94, 0.1);
    }
    
    .font-bold {
      font-weight: 600;
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
      border: 1px solid rgba(0,0,0,0.05);
      background: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    
    .btn-icon:hover {
      transform: scale(1.1);
      box-shadow: var(--shadow);
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
    .more-products {
      font-size: 0.75rem;
      color: var(--primary);
      font-weight: 600;
      margin-top: 0.4rem;
      padding: 0.2rem 0.6rem;
      background: var(--primary-light);
      border-radius: 6px;
      display: inline-block;
      border: 1px dashed var(--primary);
    }
  `]
})
export class InvoiceListComponent implements OnInit, OnDestroy, AfterViewInit {
  filteredInvoices: Invoice[] = [];
  searchQuery: string = '';
  activeTab: 'all' | 'paid' | 'debt' = 'all';
  sortOrder: string = 'date_desc';
  selectedInvoice: Invoice | null = null;
  editingInvoice: Invoice | null = null;
  showExportModal: boolean = false;
  showPasswordModal: boolean = false;
  selectedDeleteInvoice: Invoice | null = null;

  // Pagination state
  currentPage = 1;
  perPage = 15;
  totalAll = 0;
  totalPaid = 0;
  totalDebt = 0;
  hasMore = true;
  loading = false;
  loadingMore = false;

  // Scroll threshold (px before bottom to trigger load)
  private scrollThreshold = 150;

  // Search debounce
  private searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;
  private lastFetchedQuery: string | null = null;

  @ViewChild('tableContainer') tableContainerRef!: ElementRef;

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.fetchInvoices(true);

    // Setup debounce search (2s after stopped typing)
    this.searchSubscription = this.searchSubject.pipe(
      debounceTime(2000),
      distinctUntilChanged()
    ).subscribe((query) => {
      if (this.lastFetchedQuery !== query) {
        this.onEnterSearch();
      }
    });
  }

  ngAfterViewInit() {
    // Scroll listener đã được bind trực tiếp trong template qua (scroll)
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  fetchInvoices(reset = false) {
    if (reset) {
      this.currentPage = 1;
      this.hasMore = true;
      this.loading = true;
      // KHÔNG xóa filteredInvoices để giữ data cũ hiển thị dưới loading overlay
    } else {
      this.loadingMore = true;
    }

    this.dataService.getInvoicesPaginated(
      this.currentPage,
      this.perPage,
      this.searchQuery || undefined,
      this.activeTab,
      this.sortOrder
    ).subscribe({
      next: (res) => {
        if (reset) {
          this.filteredInvoices = res.invoices;
        } else {
          this.filteredInvoices = [...this.filteredInvoices, ...res.invoices];
        }

        // Cập nhật tab counts
        this.totalAll = res.totalAll;
        this.totalPaid = res.totalPaid;
        this.totalDebt = res.totalDebt;

        // Kiểm tra còn data không
        this.hasMore = res.invoices.length >= this.perPage;

        this.loading = false;
        this.loadingMore = false;
        this.lastFetchedQuery = this.searchQuery;
      },
      error: () => {
        this.loading = false;
        this.loadingMore = false;
      }
    });
  }

  onTableScroll(event: Event) {
    if (this.loadingMore || !this.hasMore || this.loading) return;

    const el = event.target as HTMLElement;
    const scrollBottom = el.scrollHeight - el.scrollTop - el.clientHeight;

    if (scrollBottom < this.scrollThreshold) {
      this.loadMore();
    }
  }

  loadMore() {
    if (this.loadingMore || !this.hasMore) return;
    this.currentPage++;
    this.fetchInvoices(false);
  }

  setTab(tab: 'all' | 'paid' | 'debt') {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.fetchInvoices(true);
  }

  onSearch() {
    this.searchSubject.next(this.searchQuery);
  }

  onEnterSearch() {
    this.fetchInvoices(true);
  }

  onSortChange() {
    this.fetchInvoices(true);
  }

  viewInvoiceDetail(invoice: Invoice) {
    this.selectedInvoice = invoice;
  }

  updateInvoice(invoice: Invoice) {
    this.editingInvoice = invoice;
  }

  onEditConfirm(updated: Invoice) {
    this.dataService.updateInvoice(updated).subscribe(() => {
      this.editingInvoice = null;
      // Cập nhật local thay vì fetch lại toàn bộ
      this.filteredInvoices = this.filteredInvoices.map(inv =>
        inv.id.toString() === updated.id.toString() ? { ...inv, ...updated } : inv
      );
    });
  }

  deleteInvoice(invoice: Invoice) {
    this.selectedDeleteInvoice = invoice;
    this.showPasswordModal = true;
  }

  onDeleteSuccess() {
    this.showPasswordModal = false;
    this.selectedDeleteInvoice = null;
    // Fetch lại từ đầu sau khi xóa
    this.fetchInvoices(true);
  }

  exportToExcel() {
    this.showExportModal = true;
  }
}
