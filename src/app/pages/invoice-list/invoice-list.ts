import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Invoice } from '../../models/data.models';
import { InvoiceDetailModalComponent } from '../../components/invoice-detail-modal/invoice-detail-modal';
import { InvoiceFormModalComponent } from '../../components/invoice-form-modal/invoice-form-modal';
import { ExportInvoiceModalComponent } from '../../components/export-invoice-modal/export-invoice-modal';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule, FormsModule, InvoiceDetailModalComponent, InvoiceFormModalComponent, ExportInvoiceModalComponent],
  template: `
    <div class="invoice-page animate-fade-in">
      <div class="list-header">
        <div class="search-bar glass-card">
          <span class="icon"><i class="ri-search-line"></i></span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Tìm theo tên khách, số điện thoại hoặc sản phẩm..."
            (input)="onFilterChange()"
          >
        </div>
        <div class="header-actions">
          <div class="sort-controls glass-card">
            <label>Sắp xếp:</label>
            <select [(ngModel)]="sortOrder" (change)="onFilterChange()">
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
          <span class="tab-count">{{ invoices.length }}</span>
        </button>
        <button class="tab-item" [class.active]="activeTab === 'paid'" (click)="setTab('paid')">
          <i class="ri-checkbox-circle-line tab-icon"></i> Đã thanh toán
          <span class="tab-count">{{ getPaidCount() }}</span>
        </button>
        <button class="tab-item" [class.active]="activeTab === 'debt'" (click)="setTab('debt')">
          <i class="ri-time-line tab-icon"></i> Còn nợ
          <span class="tab-count">{{ getDebtCount() }}</span>
        </button>
      </div>

      <div class="table-container glass-card">
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
                  <button class="btn-icon btn-delete ri-v-adjust" title="Xóa" (click)="deleteInvoice(invoice.id)">
                    <i class="ri-delete-bin-line"></i>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="filteredInvoices.length === 0">
              <td colspan="6" class="empty-state">
                <div class="empty-msg">
                  <i class="ri-file-list-3-line" style="font-size: 3rem; opacity: 0.5;"></i>
                  <p>Không có hóa đơn nào phù hợp với bộ lọc.</p>
                </div>
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
export class InvoiceListComponent implements OnInit {
  invoices: Invoice[] = [];
  filteredInvoices: Invoice[] = [];
  searchQuery: string = '';
  activeTab: 'all' | 'paid' | 'debt' = 'all';
  sortOrder: 'date_asc' | 'date_desc' | 'debt_asc' | 'debt_desc' = 'date_desc';
  selectedInvoice: Invoice | null = null;
  editingInvoice: Invoice | null = null;
  showExportModal: boolean = false;

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.dataService.invoices$.subscribe(data => {
      this.invoices = data;
      this.onFilterChange();
    });
  }

  setTab(tab: 'all' | 'paid' | 'debt') {
    this.activeTab = tab;
    this.onFilterChange();
  }

  getPaidCount() {
    return this.invoices.filter(i => i.isFullyPaid).length;
  }

  getDebtCount() {
    return this.invoices.filter(i => !i.isFullyPaid).length;
  }

  onFilterChange() {
    let result = [...this.invoices];
    
    // 1. Phân loại theo TAB
    if (this.activeTab === 'paid') {
      result = result.filter(inv => inv.isFullyPaid);
    } else if (this.activeTab === 'debt') {
      result = result.filter(inv => !inv.isFullyPaid);
    }

    // 2. Tìm kiếm
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(inv => 
        inv.buyerName?.toLowerCase().includes(q) ||
        inv.buyerPhone?.includes(q) ||
        inv.productName?.toLowerCase().includes(q) ||
        inv.products?.some(p => p.name.toLowerCase().includes(q))
      );
    }
    
    // 3. Sắp xếp
    if (this.sortOrder === 'date_desc') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (this.sortOrder === 'date_asc') {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (this.sortOrder === 'debt_desc') {
      result.sort((a, b) => b.debt - a.debt);
    } else if (this.sortOrder === 'debt_asc') {
      result.sort((a, b) => a.debt - b.debt);
    }
    
    this.filteredInvoices = result;
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
    });
  }

  deleteInvoice(id: string) {
    if (confirm('Bạn có chắc chắn muốn xóa hóa đơn này?')) {
      this.dataService.deleteInvoice(id).subscribe(() => {
      });
    }
  }

  exportToExcel() {
    this.showExportModal = true;
  }
}
