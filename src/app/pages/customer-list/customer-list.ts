import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Customer } from '../../models/data.models';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="customer-page scale-in">
      <div class="action-bar glass-card">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Tìm tên hoặc số điện thoại..."
            (input)="onSearch()"
          >
        </div>
        <div class="stats-badge">
          Tổng cộng: <b>{{ filteredCustomers.length }}</b> khách hàng
        </div>
      </div>

      <div class="table-container glass-card">
        <table style="margin-left: 0;">
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên khách hàng</th>
              <th>Số điện thoại</th>
              <th>Địa chỉ</th>
              <th class="actions-header">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let customer of filteredCustomers; let i = index">
              <td>{{ i + 1 }}</td>
              <td class="font-bold">{{ customer.name }}</td>
              <td><code>{{ customer.phone }}</code></td>
              <td>{{ customer.address }}</td>
              <td>
                <button class="btn-icon blue" (click)="openEditModal(customer)" title="Sửa">
                  ✏️
                </button>
              </td>
            </tr>
            <tr *ngIf="filteredCustomers.length === 0">
              <td colspan="5" class="empty-state">
                <div class="empty-icon">👥</div>
                <p>Không tìm thấy khách hàng nào</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Edit Modal -->
      <div class="modal-backdrop" *ngIf="isEditModalOpen" (click)="closeEditModal()">
        <div class="modal-content glass-card slide-up" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Chỉnh sửa thông tin</h3>
            <button class="close-btn" (click)="closeEditModal()">✕</button>
          </div>
          
          <div class="modal-body">
            <div class="form-group">
              <label>Tên khách hàng</label>
              <input type="text" [(ngModel)]="editingCustomer.name" placeholder="Nhập tên...">
            </div>
            
            <div class="form-group">
              <label>Số điện thoại</label>
              <input type="text" [(ngModel)]="editingCustomer.phone" placeholder="Nhập SĐT...">
            </div>
            
            <div class="form-group">
              <label>Địa chỉ</label>
              <textarea [(ngModel)]="editingCustomer.address" placeholder="Nhập địa chỉ..."></textarea>
            </div>
          </div>
          
          <div class="modal-footer">
            <button class="btn btn-outline" (click)="closeEditModal()">Hủy</button>
            <button class="btn btn-primary" (click)="saveCustomer()">Lưu thay đổi</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .customer-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .action-bar {
      padding: 1rem 1.5rem;
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
    }

    .search-box input {
      width: 100%;
      padding: 0.75rem 1rem 0.75rem 2.5rem;
      border: 1px solid var(--border);
      border-radius: 0.75rem;
      background: rgba(255, 255, 255, 0.5);
      transition: all 0.2s;
    }

    .search-box input:focus {
      background: white;
      border-color: var(--primary);
      box-shadow: 0 0 0 4px var(--primary-light);
      outline: none;
    }

    .stats-badge {
      background: var(--primary-light);
      color: var(--primary-dark);
      padding: 0.5rem 1rem;
      border-radius: 2rem;
      font-size: 0.875rem;
    }

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th {
      text-align: left;
      padding: 1rem;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
    }

    td {
      padding: 1rem;
      border-bottom: 1px solid var(--border);
      color: var(--text-main);
      font-size: 0.935rem;
    }

    .font-bold { font-weight: 700; }
    code {
        background: #f1f5f9;
        padding: 0.2rem 0.4rem;
        border-radius: 0.25rem;
        font-family: monospace;
        color: #475569;
    }

    .actions-header { text-align: center; }
    td:last-child { text-align: center; }

    .btn-icon {
      width: 32px;
      height: 32px;
      border-radius: 0.5rem;
      border: none;
      background: none;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .btn-icon.blue:hover { background: #eff6ff; }

    .empty-state {
      padding: 4rem !important;
      text-align: center;
      color: var(--text-muted);
    }

    .empty-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    /* Modal Styles */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      z-index: 2000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .modal-content {
      width: 100%;
      max-width: 500px;
      padding: 0;
      overflow: hidden;
    }

    .modal-header {
      padding: 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h3 { margin: 0; font-size: 1.25rem; }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      color: var(--text-muted);
    }

    .modal-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-main);
    }

    .form-group input, .form-group textarea {
      padding: 0.75rem 1rem;
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      width: 100%;
    }

    .form-group textarea {
      height: 100px;
      resize: vertical;
    }

    .modal-footer {
      padding: 1.25rem 1.5rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    @media (max-width: 768px) {
      .action-bar {
        flex-direction: column;
        align-items: stretch;
      }
      .search-box { max-width: none; }
    }
  `]
})
export class CustomerListComponent implements OnInit {
  customers: Customer[] = [];
  filteredCustomers: Customer[] = [];
  searchQuery = '';

  isEditModalOpen = false;
  editingCustomer: Customer = { p_id: 0, name: '', phone: '', address: '' };

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.dataService.customers$.subscribe(list => {
      this.customers = list;
      this.onSearch();
    });
  }

  onSearch() {
    if (!this.searchQuery.trim()) {
      this.filteredCustomers = [...this.customers];
    } else {
      const q = this.searchQuery.toLowerCase().trim();
      this.filteredCustomers = this.customers.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.phone.includes(q)
      );
    }
  }

  openEditModal(customer: Customer) {
    this.editingCustomer = { ...customer };
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
  }

  saveCustomer() {
    if (!this.editingCustomer.name || !this.editingCustomer.phone) {
        alert('Vui lòng điền đầy đủ tên và số điện thoại');
        return;
    }

    this.dataService.updateCustomer(this.editingCustomer).subscribe({
      next: () => {
        this.closeEditModal();
      }
    });
  }
}
