import { Component, EventEmitter, Output, OnInit, OnDestroy, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Invoice } from '../../models/data.models';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-export-invoice-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay animate-fade-in" (click)="onClose()">
      <div class="modal-content glass-card" (click)="$event.stopPropagation()">
        <header class="modal-header">
          <div class="header-title">
            <h3>Tùy chọn xuất hóa đơn</h3>
            <p class="text-muted text-sm">Chọn khoảng thời gian để xuất file Excel</p>
          </div>
          <button class="close-btn" (click)="onClose()">✕</button>
        </header>

        <div class="modal-body">
          <div class="option-group">
            <label class="option-item" [class.active]="rangeType === '3d'">
              <input type="radio" name="range" [(ngModel)]="rangeType" value="3d">
              <span class="radio-custom"></span>
              <div class="option-details">
                <span class="option-label">3 ngày gần nhất</span>
                <span class="option-desc">{{ getRangeDisplay('3d') }}</span>
              </div>
            </label>

            <label class="option-item" [class.active]="rangeType === '7d'">
              <input type="radio" name="range" [(ngModel)]="rangeType" value="7d">
              <span class="radio-custom"></span>
              <div class="option-details">
                <span class="option-label">7 ngày gần nhất</span>
                <span class="option-desc">{{ getRangeDisplay('7d') }}</span>
              </div>
            </label>

            <label class="option-item" [class.active]="rangeType === '30d'">
              <input type="radio" name="range" [(ngModel)]="rangeType" value="30d">
              <span class="radio-custom"></span>
              <div class="option-details">
                <span class="option-label">30 ngày gần nhất</span>
                <span class="option-desc">{{ getRangeDisplay('30d') }}</span>
              </div>
            </label>

            <label class="option-item" [class.active]="rangeType === 'custom'">
              <input type="radio" name="range" [(ngModel)]="rangeType" value="custom">
              <span class="radio-custom"></span>
              <div class="option-details">
                <span class="option-label">Khoảng thời gian tùy chọn</span>
              </div>
            </label>
          </div>

          <div class="custom-date-inputs animate-fade-in" *ngIf="rangeType === 'custom'">
            <div class="input-row">
              <div class="input-field">
                <label>Từ ngày</label>
                <input type="date" [(ngModel)]="customStartDate">
              </div>
              <div class="input-field">
                <label>Đến ngày</label>
                <input type="date" [(ngModel)]="customEndDate">
              </div>
            </div>
          </div>
        </div>

        <footer class="modal-footer">
          <button class="btn btn-secondary" (click)="onClose()">Hủy</button>
          <button class="btn btn-primary" [disabled]="loading" (click)="onExport()">
            <span *ngIf="!loading">📊 Xuất Excel</span>
            <span *ngIf="loading">⌛ Đang xử lý...</span>
          </button>
        </footer>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      display: flex; align-items: center; justify-content: center;
      z-index: 10000; padding: 1rem;
    }
    
    .modal-content {
      width: 100%; max-width: 450px;
      background: white; display: flex; flex-direction: column;
      border-radius: 1.25rem; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      overflow: hidden; animation: modalScale 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @keyframes modalScale {
      from { transform: scale(0.9); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    
    .modal-header {
      padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center;
    }
    
    .close-btn {
      background: none; border: none; font-size: 1.25rem; color: var(--text-muted);
      cursor: pointer; padding: 0.5rem; border-radius: 50%;
      display: flex; align-items: center; justify-content: center; transition: all 0.2s;
    }

    .close-btn:hover { background: var(--primary-light); transform: rotate(90deg); }
    
    .modal-body { padding: 1.5rem; }

    .option-group {
      display: flex; flex-direction: column; gap: 0.75rem;
    }

    .option-item {
      display: flex; align-items: center; gap: 1rem; padding: 1rem;
      border-radius: 1rem; border: 1px solid var(--border);
      cursor: pointer; transition: all 0.2s;
    }

    .option-item:hover { background: var(--bg-main); border-color: var(--primary-light); }
    .option-item.active { border-color: var(--primary); background: var(--primary-light); }

    .option-item input { display: none; }

    .radio-custom {
      width: 20px; height: 20px; border: 2px solid var(--border);
      border-radius: 50%; position: relative;
    }

    .option-item.active .radio-custom { border-color: var(--primary); }
    .option-item.active .radio-custom::after {
      content: ''; position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -50%); width: 10px; height: 10px;
      background: var(--primary); border-radius: 50%;
    }

    .option-details { display: flex; flex-direction: column; }
    .option-label { font-weight: 600; color: var(--text-main); }
    .option-desc { font-size: 0.75rem; color: var(--text-muted); }

    .custom-date-inputs {
      margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px dashed var(--border);
    }

    .input-row { display: flex; gap: 1rem; }
    .input-field { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
    .input-field label { font-size: 0.75rem; font-weight: 600; color: var(--text-muted); }
    .input-field input {
      padding: 0.5rem; border-radius: 0.5rem; border: 1px solid var(--border);
      outline: none; font-size: 0.9rem;
    }

    .modal-footer {
      padding: 1.25rem 1.5rem; border-top: 1px solid var(--border);
      display: flex; justify-content: flex-end; gap: 0.75rem;
    }

    .btn {
      padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 600;
      cursor: pointer; transition: all 0.2s; border: none;
    }

    .btn-primary { background: var(--primary); color: white; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
    .btn-primary:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }

    .btn-secondary { background: var(--bg-main); color: var(--text-main); border: 1px solid var(--border); }
    .text-sm { font-size: 0.85rem; }
  `]
})
export class ExportInvoiceModalComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();

  rangeType: '3d' | '7d' | '30d' | 'custom' = '7d';
  customStartDate: string = '';
  customEndDate: string = '';
  loading: boolean = false;

  constructor(
    private el: ElementRef, 
    private renderer: Renderer2,
    private dataService: DataService
  ) {
    const today = new Date().toISOString().split('T')[0];
    this.customStartDate = today;
    this.customEndDate = today;
  }

  ngOnInit() {
    this.renderer.appendChild(document.body, this.el.nativeElement);
  }

  ngOnDestroy() {
    this.renderer.removeChild(document.body, this.el.nativeElement);
  }

  onClose() {
    this.close.emit();
  }

  getRangeDisplay(type: string): string {
    const now = new Date();
    let start = new Date();
    
    if (type === '3d') start.setDate(now.getDate() - 3);
    else if (type === '7d') start.setDate(now.getDate() - 7);
    else if (type === '30d') start.setDate(now.getDate() - 30);
    
    return `${start.toLocaleDateString('vi-VN')} - ${now.toLocaleDateString('vi-VN')}`;
  }

  onExport() {
    let startStr = '';
    let endStr = '';
    const now = new Date();

    if (this.rangeType === 'custom') {
      startStr = this.customStartDate;
      endStr = this.customEndDate;
    } else {
      let start = new Date();
      if (this.rangeType === '3d') start.setDate(now.getDate() - 3);
      else if (this.rangeType === '7d') start.setDate(now.getDate() - 7);
      else if (this.rangeType === '30d') start.setDate(now.getDate() - 30);
      
      startStr = start.toISOString().split('T')[0];
      endStr = now.toISOString().split('T')[0];
    }

    if (!startStr || !endStr) {
      alert('Vui lòng chọn đầy đủ ngày!');
      return;
    }

    this.loading = true;
    this.dataService.getInvoicesByDateRange(startStr, endStr).subscribe({
      next: (invoices) => {
        this.processExport(invoices);
        this.loading = false;
        this.onClose();
      },
      error: () => this.loading = false
    });
  }

  private processExport(invoices: Invoice[]) {
    if (invoices.length === 0) {
      alert('Không có dữ liệu trong khoảng thời gian này!');
      return;
    }

    const excelData = invoices.map(inv => {
      let productNames = '';
      if (inv.products && inv.products.length > 0) {
        productNames = inv.products.map(p => `${p.name} (${p.sellingPrice.toLocaleString()}đ)`).join('\n');
      } else {
        productNames = `${inv.productName || 'N/A'} (${(inv.productPrice || 0).toLocaleString()}đ)`;
      }

      return {
        'Khách hàng': inv.buyerName,
        'Số điện thoại': inv.buyerPhone,
        'Sản phẩm': productNames,
        'Đã trả (đ)': inv.amountPaid,
        'Còn nợ (đ)': inv.debt,
        'Ngày lập': new Date(inv.createdAt).toLocaleString('vi-VN'),
        'Trạng thái': inv.isFullyPaid ? 'Đã trả hết' : 'Còn nợ'
      };
    });

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(excelData);
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 40 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 15 }];

    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hóa đơn');

    const fileName = `DSHD_${this.rangeType}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }
}
