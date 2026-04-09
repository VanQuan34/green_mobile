import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Invoice } from '../../models/data.models';
import { InvoiceDetailModalComponent } from '../../components/invoice-detail-modal/invoice-detail-modal';
import { ManualDebtModalComponent } from '../../components/manual-debt-modal/manual-debt-modal';
import { ProductDetailModalComponent } from '../../components/product-detail/product-detail';

@Component({
  selector: 'app-debt-list',
  standalone: true,
  imports: [CommonModule, FormsModule, InvoiceDetailModalComponent, ManualDebtModalComponent],
  template: `
    <div class="debt-page">
      <div class="filter-bar glass-card animate-fade-in">
        <div class="filter-group">
          <label>Thời gian:</label>
          <div class="quick-filters">
            <button class="btn btn-sm" [class.btn-primary]="timeFilter === '3d'" (click)="setTimeFilter('3d')">3 ngày</button>
            <button class="btn btn-sm" [class.btn-primary]="timeFilter === '7d'" (click)="setTimeFilter('7d')">7 ngày</button>
            <button class="btn btn-sm" [class.btn-primary]="timeFilter === '1m'" (click)="setTimeFilter('1m')">1 tháng</button>
            <button class="btn btn-sm" [class.btn-primary]="timeFilter === 'custom'" (click)="setTimeFilter('custom')">Tùy chọn</button>
          </div>
        </div>

        <div class="date-inputs animate-fade-in" *ngIf="timeFilter === 'custom'">
          <div class="input-item">
            <label>Từ ngày:</label>
            <input type="date" [(ngModel)]="startDate" (change)="applyFilters()">
          </div>
          <div class="input-item">
            <label>Đến ngày:</label>
            <input type="date" [(ngModel)]="endDate" (change)="applyFilters()">
          </div>
        </div>

        <div class="search-group">
          <input type="text" [(ngModel)]="searchQuery" (input)="applyFilters()" placeholder="Tìm tên khách, SĐT...">
        </div>

        <div class="sort-group">
          <label>Sắp xếp nợ:</label>
          <select [(ngModel)]="sortOrder" (change)="applyFilters()">
            <option value="desc">Giảm dần (Nhiều nhất)</option>
            <option value="asc">Tăng dần (Ít nhất)</option>
          </select>
        </div>

        <div class="action-group">
          <button class="btn btn-primary btn-add" (click)="showManualDebtModal = true">
            <span class="icon">+</span> Quản lý nợ ngoài
          </button>
        </div>
      </div>

      <div class="stats-cards animate-fade-in">
        <div class="stat-card glass-card">
          <div class="stat-label">Tổng số khách nợ</div>
          <div class="stat-value">{{ filteredDebts.length }}</div>
        </div>
        <div class="stat-card glass-card primary">
          <div class="stat-label">Tổng tiền nợ</div>
          <div class="stat-value">{{ totalDebtAmount | number }}đ</div>
        </div>
      </div>

      <div class="table-container glass-card animate-fade-in">
        <table>
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Số điện thoại</th>
              <!-- <th>Sản phẩm</th> -->
              <th>Tổng tiền</th>
              <th>Đã trả</th>
              <th>Còn nợ</th>
              <th>Ngày mua</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of filteredDebts" (click)="viewInvoice(item)" class="clickable-row">
              <td>
                <div class="customer-info">
                  <span class="name">{{ item.buyerName }}</span>
                  <span class="address">{{ item.buyerAddress }}</span>
                </div>
              </td>
              <td>{{ item.buyerPhone }}</td>
              <!-- <td>
                <div class="product-info">
                  <div class="p-item-tag" *ngFor="let p of item.products?.slice(0, 2)">
                    <span class="p-name">• {{ p.name }}</span>
                  </div>
                  <div class="more-products" *ngIf="item.products && item.products.length > 2">
                    ... và {{ item.products.length - 2 }} khác
                  </div>
                </div>
              </td> -->
              <td class="font-bold">{{ item.totalAmount | number }}đ</td>
              <td class="text-green">{{ item.amountPaid | number }}đ</td>
              <td class="text-red font-bold">{{ item.debt | number }}đ</td>
              <td>
                <div class="date-info">
                  <span class="date">{{ item.createdAt | date:'dd/MM/yyyy' }}</span>
                  <span class="badge-new" *ngIf="isRecent(item.createdAt)">Mới</span>
                </div>
              </td>
              <td>
                <button class="btn btn-sm btn-outline">Chi tiết</button>
              </td>
            </tr>
            <tr *ngIf="filteredDebts.length === 0">
              <td colspan="8" class="empty-state">Không có dữ liệu công nợ phù hợp.</td>
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

      <!-- Manual Debt Modal -->
      <app-manual-debt-modal
        *ngIf="showManualDebtModal"
        (close)="showManualDebtModal = false"
        (save)="onManualDebtSaved()">
      </app-manual-debt-modal>
    </div>
  `,
  styles: [`
    .debt-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .filter-bar {
      padding: 1.25rem;
      display: flex;
      flex-wrap: wrap;
      gap: 1.5rem;
      align-items: flex-end;
    }

    .filter-group label, .input-item label, .sort-group label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--text-muted);
    }

    .quick-filters {
      display: flex;
      gap: 0.5rem;
    }

    .btn-add {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1.25rem;
      white-space: nowrap;
    }

    .date-inputs {
      display: flex;
      gap: 1rem;
    }

    .search-group {
      flex: 1;
      min-width: 200px;
    }

    .stats-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
    }

    .stat-card {
      padding: 1.5rem;
      text-align: center;
    }

    .stat-card.primary {
      border-left: 4px solid var(--primary);
    }

    .stat-label {
      font-size: 0.9rem;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .name {
      display: block;
      font-weight: 700;
    }

    .address {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .text-red { color: #ef4444; }
    .text-green { color: #10b981; }

    .clickable-row {
      cursor: pointer;
      transition: background 0.2s;
    }

    .clickable-row:hover {
      background: #f1f5f9;
    }

    .p-item-tag {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
    }

    .p-name {
      font-weight: 600;
      font-size: 0.85rem;
    }

    .empty-state {
      padding: 3rem !important;
      text-align: center;
      color: var(--text-muted);
    }

    .date-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .badge-new {
      display: inline-block;
      padding: 0.1rem 0.4rem;
      background: #fef3c7;
      color: #d97706;
      border-radius: 4px;
      font-size: 0.65rem;
      font-weight: 700;
      width: fit-content;
    }

    @media (max-width: 768px) {
      .filter-bar {
        flex-direction: column;
        align-items: stretch;
      }
      .date-inputs {
        flex-direction: column;
      }
    }
    .more-products {
      font-size: 0.7rem;
      color: var(--primary);
      font-weight: 700;
      margin-top: 0.3rem;
      padding: 0.15rem 0.5rem;
      background: var(--primary-light);
      border-radius: 4px;
      display: inline-block;
      border: 1px dashed var(--primary);
    }
  `]
})
export class DebtListComponent implements OnInit {
  allInvoices: Invoice[] = [];
  filteredDebts: Invoice[] = [];

  timeFilter: '3d' | '7d' | '1m' | 'custom' = '7d';
  startDate: string = '';
  endDate: string = '';
  searchQuery: string = '';
  sortOrder: 'asc' | 'desc' = 'desc';

  totalDebtAmount = 0;
  selectedInvoice: Invoice | null = null;
  showManualDebtModal = false;

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.dataService.invoices$.subscribe(list => {
      this.allInvoices = list;
      this.applyFilters();
    });
  }

  onManualDebtSaved() {
    this.showManualDebtModal = false;
    // DataService will trigger a refresh via invoices$ subscription
  }

  setTimeFilter(filter: '3d' | '7d' | '1m' | 'custom') {
    this.timeFilter = filter;
    if (filter !== 'custom') {
      this.applyFilters();
    }
  }

  applyFilters() {
    let list = this.allInvoices.filter(i => i.debt > 0);

    // Time filtering
    const now = new Date();
    if (this.timeFilter !== 'custom') {
      const days = this.timeFilter === '3d' ? 3 : this.timeFilter === '7d' ? 7 : 30;
      const cutoff = new Date();
      cutoff.setDate(now.getDate() - days);
      list = list.filter(i => new Date(i.createdAt) >= cutoff);
    } else if (this.startDate && this.endDate) {
      const start = new Date(this.startDate);
      const end = new Date(this.endDate);
      end.setHours(23, 59, 59);
      list = list.filter(i => {
        const d = new Date(i.createdAt);
        return d >= start && d <= end;
      });
    }

    // Search filtering
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(i =>
        i.buyerName.toLowerCase().includes(q) ||
        i.buyerPhone.includes(q)
      );
    }

    // 3. Sắp xếp (Trước khi gộp để lấy ngày mới nhất dễ hơn nếu cần, hoặc gộp xong mới sắp)
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 4. Gộp theo khách hàng
    const groups = new Map<string, Invoice>();
    list.forEach(inv => {
      const key = inv.buyerPhone || inv.buyerName;
      const totalAmt = inv.totalAmount || inv.productPrice || 1;

      // Chuẩn bị danh sách sản phẩm kèm ngày mua và tiền đã trả từng món (pro-rata)
      const currentInvProducts: any[] = inv.products ?
        inv.products.map(p => {
          const ratio = p.sellingPrice / totalAmt;
          return {
            ...p,
            purchaseDate: inv.createdAt,
            amountPaid: Math.round(inv.amountPaid * ratio),
            debt: Math.round(inv.debt * ratio)
          };
        }) :
        (inv.productName ? [{
          name: inv.productName,
          purchaseDate: inv.createdAt,
          amountPaid: inv.amountPaid,
          debt: inv.debt,
          sellingPrice: inv.productPrice || 0
        }] : []);

      if (!groups.has(key)) {
        groups.set(key, { 
          ...inv, 
          products: currentInvProducts,
          originalInvoices: [inv] 
        });
      } else {
        const group = groups.get(key)!;
        group.totalAmount += (inv.totalAmount || inv.productPrice || 0);
        group.amountPaid += inv.amountPaid;
        group.debt += inv.debt;

        // Gộp sản phẩm kèm ngày mua
        group.products = [...(group.products || []), ...currentInvProducts];
        
        // Lưu trữ hóa đơn gốc
        group.originalInvoices = [...(group.originalInvoices || []), inv];

        // Giữ ngày mới nhất cho meta data chung của nhóm
        if (new Date(inv.createdAt) > new Date(group.createdAt)) {
          group.createdAt = inv.createdAt;
        }
      }
    });

    let mergedList = Array.from(groups.values());

    // 5. Sắp xếp theo nợ sau khi đã gộp
    mergedList.sort((a, b) => {
      return this.sortOrder === 'desc' ? b.debt - a.debt : a.debt - b.debt;
    });

    this.filteredDebts = mergedList;
    this.totalDebtAmount = mergedList.reduce((sum, i) => sum + i.debt, 0);
  }

  viewInvoice(invoice: Invoice) {
    this.selectedInvoice = invoice;
  }

  isRecent(date: Date | string): boolean {
    if (!date) return false;
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    return diff < 3 * 24 * 60 * 60 * 1000;
  }
}
