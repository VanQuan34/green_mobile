import { Component, OnInit, Renderer2, Inject, ElementRef, ViewChild } from '@angular/core';
import { DOCUMENT } from '@angular/common';
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

      <!-- Edit Modal Container -->
      <div #modalContainer>
        <div class="modal-backdrop" *ngIf="isEditModalOpen" (click)="closeEditModal()">
          <div class="modal-content glass-card slide-up full-width-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="header-title">
                <span class="header-icon">👤</span>
                <h3>Chỉnh sửa thông tin khách hàng</h3>
              </div>
              <button class="close-btn" (click)="closeEditModal()">✕</button>
            </div>
            
            <div class="modal-body scrollable">
              <div class="form-grid">
                <div class="form-group full-width">
                  <label>Họ và tên</label>
                  <div class="input-wrapper">
                    <span class="input-icon">👤</span>
                    <input type="text" [(ngModel)]="editingCustomer.name" placeholder="Nhập họ và tên khách hàng...">
                  </div>
                </div>
                
                <div class="form-group full-width">
                  <label>Số điện thoại</label>
                  <div class="input-wrapper">
                    <span class="input-icon">📞</span>
                    <input type="text" [(ngModel)]="editingCustomer.phone" placeholder="Nhập số điện thoại...">
                  </div>
                </div>
                
                <div class="form-group full-width">
                  <label>Địa chỉ</label>
                  <div class="input-wrapper align-top">
                    <span class="input-icon">📍</span>
                    <textarea [(ngModel)]="editingCustomer.address" placeholder="Nhập địa chỉ chi tiết..."></textarea>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="modal-footer">
              <button class="btn btn-outline" (click)="closeEditModal()">
                <span>Hủy bỏ</span>
              </button>
              <button class="btn btn-primary" (click)="saveCustomer()">
                <span class="btn-icon-s">💾</span>
                <span>Lưu thay đổi</span>
              </button>
            </div>
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

    /* Full Width Modal Styles */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: flex-end; /* Mobile style: slide from bottom */
      justify-content: center;
    }

    .modal-content.full-width-modal {
      width: 100%;
      max-width: 100%; /* Full width */
      height: auto;
      max-height: 92vh;
      border-radius: 1.5rem 1.5rem 0 0; /* Rounded top for mobile */
      margin: 0;
      display: flex;
      flex-direction: column;
      box-shadow: 0 -10px 25px -5px rgba(0, 0, 0, 0.2);
    }

    @media (min-width: 768px) {
      .modal-backdrop {
        align-items: center;
        padding: 2rem;
      }
      .modal-content.full-width-modal {
        max-width: 800px; /* Cân đối trên desktop */
        border-radius: 1.25rem;
        overflow: hidden;
      }
    }

    .modal-header {
      padding: 1.25rem 1.5rem;
      background: rgba(255, 255, 255, 0.8);
      border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .header-icon {
      font-size: 1.25rem;
      background: var(--primary-light);
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 10px;
    }

    .modal-header h3 { 
      margin: 0; 
      font-size: 1.15rem;
      font-weight: 700;
      color: #1e293b;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: none;
      background: #f1f5f9;
      color: #64748b;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }

    .close-btn:hover {
      background: #e2e8f0;
      color: #0f172a;
    }

    .modal-body.scrollable {
      padding: 1.5rem;
      overflow-y: auto;
      background: #fafafa;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }

    .form-group label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: #475569;
      margin-bottom: 0.5rem;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .input-icon {
      position: absolute;
      left: 1rem;
      color: #94a3b8;
      font-size: 1rem;
    }

    .input-wrapper input, .input-wrapper textarea {
      width: 100%;
      padding: 0.75rem 1rem 0.75rem 2.75rem;
      border: 1.5px solid #e2e8f0;
      border-radius: 0.75rem;
      font-size: 0.95rem;
      background: #fff;
      transition: all 0.2s;
    }

    .input-wrapper input:focus, .input-wrapper textarea:focus {
      border-color: #10b981;
      box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.1);
      outline: none;
    }

    .input-wrapper textarea {
      min-height: 120px;
      padding-top: 0.85rem;
    }

    .align-top .input-icon {
      top: 0.85rem;
    }

    .modal-footer {
      padding: 1.25rem 1.5rem;
      background: #fff;
      border-top: 1px solid rgba(0, 0, 0, 0.05);
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
    }

    .btn {
      padding: 0.75rem 1.5rem;
      border-radius: 0.75rem;
      font-weight: 600;
      font-size: 0.9rem;
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-outline {
      background: #fff;
      border: 1.5px solid #e2e8f0;
      color: #475569;
    }

    .btn-outline:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .btn-primary {
      background: #10b981;
      border: none;
      color: #fff;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
    }

    .btn-primary:hover {
      background: #059669;
      transform: translateY(-1px);
    }

    .btn-icon-s { font-size: 1.1rem; }

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
  @ViewChild('modalContainer') modalContainer!: ElementRef;

  constructor(
    private dataService: DataService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document
  ) { }

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

    // Append to body after a short delay to ensure modal is rendered
    setTimeout(() => {
      if (this.modalContainer) {
        this.renderer.appendChild(this.document.body, this.modalContainer.nativeElement);
      }
    }, 0);
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    // Move back to component's DOM when closing
    if (this.modalContainer) {
      // Technically not strictly necessary but good for cleanup
    }
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
