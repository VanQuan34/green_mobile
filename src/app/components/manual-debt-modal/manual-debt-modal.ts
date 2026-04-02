import { Component, EventEmitter, Output, OnInit, OnDestroy, Renderer2, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Invoice, Product } from '../../models/data.models';

interface ImportItem {
  id: string;
  name: string;
  amount: number;
  status: 'ok' | 'error';
}

@Component({
  selector: 'app-manual-debt-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay animate-fade-in">
      <div class="modal-container glass-card animate-scale-up">
        <div class="modal-header">
          <h2>Quản lý Công nợ ngoài</h2>
          <button class="close-btn" (click)="onClose()">✕</button>
        </div>

        <div class="modal-tabs">
          <button [class.active]="activeTab === 'single'" (click)="activeTab = 'single'">Nhập thủ công</button>
          <button [class.active]="activeTab === 'file'" (click)="activeTab = 'file'">Nhập từ file (.txt)</button>
        </div>

        <div class="modal-body">
          <!-- Single Entry Tab -->
          <div *ngIf="activeTab === 'single'" class="tab-content animate-fade-in">
            <div class="form-group">
              <label class="required">Tên khách hàng:</label>
              <input type="text" [(ngModel)]="singleEntry.name" placeholder="Ví dụ: Nguyễn Văn A">
            </div>
            <div class="form-group">
              <label class="required">Số tiền nợ (đ):</label>
              <input type="number" [(ngModel)]="singleEntry.amount" placeholder="Ví dụ: 1500000">
            </div>
            <div class="form-group">
              <label>Số điện thoại (tùy chọn):</label>
              <input type="text" [(ngModel)]="singleEntry.phone" placeholder="Số điện thoại...">
            </div>
          </div>

          <!-- File Upload Tab -->
          <div *ngIf="activeTab === 'file'" class="tab-content animate-fade-in">
            <div class="upload-area" (click)="fileInput.click()" [class.has-file]="importPreview.length > 0">
              <div class="upload-icon">📄</div>
              <p *ngIf="importPreview.length === 0">Chọn file .txt hoặc kéo thả vào đây</p>
              <p *ngIf="importPreview.length > 0" class="text-green">Đã đọc {{ importPreview.length }} dòng</p>
              <input #fileInput type="file" accept=".txt" (change)="onFileChange($event)" hidden>
            </div>

            <div class="import-preview" *ngIf="importPreview.length > 0">
              <div class="preview-header">
                <span>Xem bản nháp:</span>
                <button class="btn-text" (click)="clearImport()">Xóa hết</button>
              </div>
              <div class="preview-list">
                <div *ngFor="let item of importPreview" class="preview-item" [class.error]="item.status === 'error'">
                  <span class="p-name">{{ item.name }}</span>
                  <span class="p-amount" *ngIf="item.status === 'ok'">{{ item.amount | number }}đ</span>
                  <span class="p-error" *ngIf="item.status === 'error'">Lỗi định dạng (Tên SốTiền)</span>
                </div>
              </div>
            </div>

            <div class="help-text">
              <span class="icon">💡</span>
               Định dạng file: Mỗi dòng một khách (Tên SốTiền). Ví dụ: <br>
              <code>Quân 1500000</code><br>
              <code>Tuấn 2000000</code>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-outline" (click)="onClose()">Hủy</button>
          <button 
            class="btn btn-primary" 
            [disabled]="isSaveDisabled() || isSaving"
            (click)="onSave()"
          >
            <span class="spinner" *ngIf="isSaving"></span>
            {{ isSaving ? 'Đang lưu...' : 'Lưu công nợ' }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 1rem;
    }

    .modal-container {
      width: 100%;
      max-width: 500px;
      padding: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      max-height: 90vh;
    }

    .modal-header {
      padding: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid var(--border);
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--text-muted);
    }

    .modal-tabs {
      display: flex;
      padding: 0.5rem 1.5rem;
      background: rgba(0,0,0,0.02);
      gap: 1rem;
      border-bottom: 1px solid var(--border);
    }

    .modal-tabs button {
      padding: 0.75rem 0;
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.9rem;
    }

    .modal-tabs button.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }

    .modal-body {
      padding: 1.5rem;
      overflow-y: auto;
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--text-muted);
    }

    .form-group input {
      width: 100%;
    }

    .upload-area {
      border: 2px dashed var(--border);
      border-radius: 1rem;
      padding: 2.5rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .upload-area:hover {
      border-color: var(--primary);
      background: var(--primary-light);
    }

    .upload-area.has-file {
      padding: 1.5rem;
      border-color: var(--primary);
    }

    .upload-icon {
      font-size: 2.5rem;
      margin-bottom: 1rem;
    }

    .import-preview {
      margin-top: 1.5rem;
    }

    .preview-header {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 0.75rem;
    }

    .btn-text {
      background: none;
      border: none;
      color: var(--red);
      cursor: pointer;
      font-size: 0.8rem;
    }

    .preview-list {
      background: #f8fafc;
      border-radius: 0.75rem;
      padding: 0.5rem;
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid var(--border);
    }

    .preview-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      font-size: 0.9rem;
    }

    .preview-item.error {
      color: var(--red);
      background: var(--red-light);
    }

    .p-amount {
      font-weight: 600;
      color: var(--primary-dark);
    }

    .p-error {
      font-size: 0.75rem;
      font-style: italic;
    }

    .help-text {
      margin-top: 1.5rem;
      padding: 1rem;
      background: #fffcee;
      border-radius: 0.75rem;
      font-size: 0.825rem;
      line-height: 1.5;
      color: #856404;
    }

    .modal-footer {
      padding: 1.5rem;
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      border-top: 1px solid var(--border);
    }

    .text-green { color: var(--primary-dark); font-weight: 600; }

    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 0.6s linear infinite;
      display: inline-block;
      margin-right: 0.5rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class ManualDebtModalComponent implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();

  activeTab: 'single' | 'file' = 'single';
  isSaving = false;
  
  singleEntry = {
    name: '',
    phone: '',
    amount: null as number | null
  };

  importPreview: ImportItem[] = [];

  constructor(
    private renderer: Renderer2,
    private el: ElementRef,
    private dataService: DataService
  ) {}

  ngOnInit() {
    this.renderer.appendChild(document.body, this.el.nativeElement);
  }

  ngOnDestroy() {
    if (this.el.nativeElement.parentNode === document.body) {
      this.renderer.removeChild(document.body, this.el.nativeElement);
    }
  }

  onClose() {
    this.close.emit();
  }

  onFileChange(event: any) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const text = e.target.result;
        this.parseText(text);
      };
      reader.readAsText(file);
    }
    // Reset input
    event.target.value = '';
  }

  parseText(text: string) {
    const lines = text.split(/\r?\n/);
    const newItems: ImportItem[] = [];
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Match pattern "[Name] [Amount]"
      const match = trimmed.match(/(.+)\s+(\d+)$/);
      if (match) {
        newItems.push({
          id: Date.now().toString() + Math.random(),
          name: match[1].trim(),
          amount: parseInt(match[2], 10),
          status: 'ok'
        });
      } else {
        newItems.push({
          id: Date.now().toString() + Math.random(),
          name: trimmed,
          amount: 0,
          status: 'error'
        });
      }
    });
    this.importPreview = newItems;
  }

  clearImport() {
    this.importPreview = [];
  }

  isSaveDisabled(): boolean {
    if (this.activeTab === 'single') {
      return !this.singleEntry.name || !this.singleEntry.amount || this.singleEntry.amount <= 0;
    } else {
      return this.importPreview.length === 0 || this.importPreview.some(i => i.status === 'error');
    }
  }

  onSave() {
    this.isSaving = true;
    const itemsToSave: any[] = [];
    
    if (this.activeTab === 'single') {
      itemsToSave.push({
        name: this.singleEntry.name,
        amount: this.singleEntry.amount!,
        phone: this.singleEntry.phone
      });
    } else {
      this.importPreview.forEach(item => {
        itemsToSave.push({
          name: item.name,
          amount: item.amount,
          phone: ''
        });
      });
    }

    // Process all items sequentially
    let index = 0;
    
    if (itemsToSave.length > 1) {
      console.log(`Bắt đầu lưu ${itemsToSave.length} khoản nợ...`);
    }

    const saveNext = () => {
      if (index >= itemsToSave.length) {
        this.isSaving = false;
        this.save.emit();
        alert(`Đã lưu thành công ${itemsToSave.length} khoản nợ.`);
        this.onClose();
        return;
      }

      const item = itemsToSave[index];
      // Generate a truly unique ID in frontend to avoid collisions in backend
      const uniqueId = 'MANUAL-' + Date.now() + '-' + index + '-' + Math.floor(Math.random() * 10000);
      
      const invoice: Invoice = {
        id: uniqueId,
        buyerName: item.name,
        buyerPhone: item.phone,
        buyerAddress: 'Công nợ nhập ngoài',
        totalAmount: item.amount,
        productName: 'Nợ cũ / Nợ ngoài',
        productPrice: item.amount,
        amountPaid: 0,
        debt: item.amount,
        isFullyPaid: false,
        createdAt: new Date(),
        products: []
      };

      this.dataService.addInvoice(invoice).subscribe({
        next: () => {
          index++;
          // Increase delay to 200ms for better stability with PHP/WP backend
          setTimeout(() => saveNext(), 200);
        },
        error: (err) => {
          console.error('Error saving invoice:', err);
          alert(`Lỗi khi lưu người dùng thứ ${index + 1} (${item.name}): ${err.message || 'Lỗi server'}`);
          this.isSaving = false;
        }
      });
    };

    saveNext();
  }
}
