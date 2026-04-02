import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { Invoice } from '../../models/data.models';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="invoice-page animate-fade-in">
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
            <tr *ngFor="let invoice of invoices" [ngClass]="{'debt-row': !invoice.isFullyPaid, 'paid-row': invoice.isFullyPaid}">
              <td>
                <div class="customer-info">
                  <span class="name">{{ invoice.buyerName }}</span>
                  <span class="phone text-muted">{{ invoice.buyerPhone }}</span>
                </div>
              </td>
              <td>
                <div class="product-info">
                  <ng-container *ngIf="invoice.products && invoice.products.length > 0; else legacyProduct">
                    <div class="p-item-tag" *ngFor="let p of invoice.products">
                      <span class="p-name">{{ p.name }}</span>
                      <span class="p-price text-muted">{{ p.sellingPrice | number }}đ</span>
                    </div>
                  </ng-container>
                  <ng-template #legacyProduct>
                    <span class="p-name">{{ invoice.productName }}</span>
                    <span class="p-price text-muted">{{ invoice.productPrice | number }}đ</span>
                  </ng-template>
                </div>
              </td>
              <td class="font-bold">{{ invoice.amountPaid | number }}đ</td>
              <td>
                <span class="debt-amount" [class.has-debt]="invoice.debt > 0">
                  {{ invoice.debt | number }}đ
                </span>
              </td>
              <td class="text-muted">{{ invoice.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
              <td class="actions-cell">
                <div class="btn-group">
                  <button class="btn-icon" title="Cập nhật" (click)="updateInvoice(invoice)">
                    <span>✏️</span>
                  </button>
                  <button class="btn-icon btn-delete" title="Xóa" (click)="deleteInvoice(invoice.id)">
                    <span>🗑️</span>
                  </button>
                </div>
              </td>
            </tr>
            <tr *ngIf="invoices.length === 0">
              <td colspan="6" class="empty-state">
                <div class="empty-msg">
                  <span>📄</span>
                  <p>Chưa có hóa đơn nào được lập.</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .invoice-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
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
  `]
})
export class InvoiceListComponent implements OnInit {
  invoices: Invoice[] = [];

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.dataService.invoices$.subscribe(data => {
      this.invoices = data;
    });
  }

  updateInvoice(invoice: Invoice) {
    console.log('Update invoice', invoice);
    // Not explicitly requested for detail popup, but added toolbar item
  }

  deleteInvoice(id: string) {
    if (confirm('Bạn có chắc chắn muốn xóa hóa đơn này?')) {
      this.dataService.deleteInvoice(id);
    }
  }
}
