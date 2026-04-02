import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Invoice } from '../../models/data.models';

@Component({
  selector: 'app-debt-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
              <th>Sản phẩm</th>
              <th>Tổng tiền</th>
              <th>Đã trả</th>
              <th>Còn nợ</th>
              <th>Ngày mua</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of filteredDebts">
              <td>
                <div class="customer-info">
                  <span class="name">{{ item.buyerName }}</span>
                  <span class="address">{{ item.buyerAddress }}</span>
                </div>
              </td>
              <td>{{ item.buyerPhone }}</td>
              <td>{{ item.productName }}</td>
              <td>{{ item.productPrice | number }}đ</td>
              <td class="text-green">{{ item.amountPaid | number }}đ</td>
              <td class="text-red font-bold">{{ item.debt | number }}đ</td>
              <td>{{ item.createdAt | date:'dd/MM/yyyy' }}</td>
              <td>
                <button class="btn btn-sm btn-outline" (click)="viewInvoice(item)">Chi tiết</button>
              </td>
            </tr>
            <tr *ngIf="filteredDebts.length === 0">
              <td colspan="8" class="empty-state">Không có dữ liệu công nợ phù hợp.</td>
            </tr>
          </tbody>
        </table>
      </div>
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

    .empty-state {
      padding: 3rem !important;
      text-align: center;
      color: var(--text-muted);
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

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.dataService.invoices$.subscribe(list => {
      this.allInvoices = list;
      this.applyFilters();
    });
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

    // Sorting
    list.sort((a, b) => {
      return this.sortOrder === 'desc' ? b.debt - a.debt : a.debt - b.debt;
    });

    this.filteredDebts = list;
    this.totalDebtAmount = list.reduce((sum, i) => sum + i.debt, 0);
  }

  viewInvoice(invoice: Invoice) {
    // Logic to view detail if needed
    alert(`Khách: ${invoice.buyerName}\nCòn nợ: ${invoice.debt.toLocaleString()}đ`);
  }
}
