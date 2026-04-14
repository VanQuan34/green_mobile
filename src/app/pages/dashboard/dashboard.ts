import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../services/data.service';
import { Product, Invoice } from '../../models/data.models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-page scale-in">
      <!-- Loading Overlay -->
      <div class="loading-overlay" *ngIf="isLoading">
        <div class="spinner-container">
          <div class="premium-spinner"></div>
          <span>Đang tải dữ liệu...</span>
        </div>
      </div>

      <!-- Time Filter Section -->
      <div class="dashboard-filter-container glass-card mb-4">
        <div class="filter-tabs-wrapper">
          <div class="filter-tabs">
            <button 
              class="filter-tab-btn" 
              [class.active]="selectedPeriod === 'all'"
              (click)="onPeriodChange('all')">
              Toàn bộ
            </button>
            <button 
              class="filter-tab-btn" 
              [class.active]="selectedPeriod === '7d'"
              (click)="onPeriodChange('7d')">
              7 ngày qua
            </button>
            <button 
              class="filter-tab-btn" 
              [class.active]="selectedPeriod === '30d'"
              (click)="onPeriodChange('30d')">
              30 ngày qua
            </button>
            
            <div class="divider"></div>
            
            <div class="month-selector">
              <select 
                class="filter-select" 
                [ngModel]="getSelectedMonth()" 
                (change)="onMonthSelect($event)">
                <option value="" disabled>Chọn theo tháng...</option>
                <option *ngFor="let m of months" [value]="'month-' + m.val">
                  {{ m.label }}
                </option>
              </select>
            </div>

            <div class="divider"></div>

            <button 
              class="filter-tab-btn" 
              [class.active]="selectedPeriod === 'custom'"
              (click)="onPeriodChange('custom')">
              <i class="ri-calendar-line ri-v-adjust mr-1"></i> Tùy chọn
            </button>
          </div>
        </div>

        <!-- Custom Date Range -->
        <div class="custom-date-row mt-3" *ngIf="selectedPeriod === 'custom'">
          <div class="date-field">
            <label>Từ ngày</label>
            <input type="date" [(ngModel)]="customStartDate" (ngModelChange)="onCustomDateChange()" />
          </div>
          <div class="date-field">
            <label>Đến ngày</label>
            <input type="date" [(ngModel)]="customEndDate" (ngModelChange)="onCustomDateChange()" />
          </div>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card glass-card">
          <div class="kpi-icon blue"><i class="ri-money-dollar-circle-line"></i></div>
          <div class="kpi-content">
            <label>Tổng doanh thu</label>
            <div class="value">{{ stats.totalRevenue | number }}đ</div>
          </div>
        </div>
        <div class="kpi-card glass-card">
          <div class="kpi-icon green"><i class="ri-checkbox-circle-line"></i></div>
          <div class="kpi-content">
            <label>Thực thu (Đã trả)</label>
            <div class="value">{{ stats.totalPaid | number }}đ</div>
          </div>
        </div>
        <div class="kpi-card glass-card">
          <div class="kpi-icon orange"><i class="ri-line-chart-line"></i></div>
          <div class="kpi-content">
            <label>Lợi nhuận gộp</label>
            <div class="value text-green">{{ stats.totalProfit | number }}đ</div>
          </div>
        </div>
        <div class="kpi-card glass-card">
          <div class="kpi-icon yellow"><i class="ri-hand-coin-line"></i></div>
          <div class="kpi-content">
            <label>Tổng công nợ</label>
            <div class="value text-red">{{ stats.totalDebt | number }}đ</div>
          </div>
        </div>
        <div class="kpi-card glass-card">
          <div class="kpi-icon purple"><i class="ri-smartphone-line"></i></div>
          <div class="kpi-content">
            <label>Máy đã bán / Tồn</label>
            <div class="value">{{ stats.soldCount }} / {{ stats.inventoryCount }}</div>
          </div>
        </div>
      </div>

      <!-- Special KPI Row (Inventory related, usually not affected by time filter) -->
      <div class="kpi-row-special">
        <div class="kpi-card glass-card cyan">
          <div class="kpi-icon cyan"><i class="ri-database-2-line"></i></div>
          <div class="kpi-content">
            <label>Tổng vốn (Toàn bộ kho)</label>
            <div class="value">{{ stats.totalInventoryValue | number }}đ</div>
          </div>
        </div>
        <div class="kpi-card glass-card indigo">
          <div class="kpi-icon indigo"><i class="ri-focus-3-line"></i></div>
          <div class="kpi-content">
            <label>Giá trị kho (Dự kiến bán hết)</label>
            <div class="value">{{ stats.expectedTotalRevenue | number }}đ</div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-grid">
        <div class="chart-container glass-card">
          <div class="chart-header">
            <h3>Biểu đồ xu hướng</h3>
            <span class="period-label text-muted" *ngIf="selectedPeriod !== 'custom'">
              {{ getPeriodLabel() }}
            </span>
          </div>
          <div class="canvas-wrapper">
            <canvas #salesChart></canvas>
          </div>
        </div>
        
        <div class="chart-container glass-card">
          <div class="chart-header">
            <h3>Tỷ lệ kho hàng</h3>
          </div>
          <div class="canvas-wrapper doughnut-wrapper">
            <canvas #inventoryChart></canvas>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-bottom: 2rem;
      position: relative;
      min-height: 500px;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      justify-content: center;
      align-items: center;
      border-radius: 20px;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .spinner-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }

    .spinner-container span {
      font-weight: 600;
      color: #10b981;
      font-size: 0.9rem;
    }

    .premium-spinner {
      width: 50px;
      height: 50px;
      border: 3px solid rgba(16, 185, 129, 0.1);
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 0.8s cubic-bezier(0.5, 0, 0.5, 1) infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .dashboard-filter-container {
      padding: 1.25rem;
      border-radius: 16px;
    }

    .filter-tabs-wrapper {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      display: flex;
    }

    .filter-tabs {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-bottom: 4px;
    }

    .filter-tab-btn {
      border: 1.5px solid rgba(0, 0, 0, 0.05);
      background: #f8fafc;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #64748b;
      cursor: pointer;
      transition: all 0.25s ease;
      white-space: nowrap;
    }

    .filter-tab-btn:hover {
      background: #f1f5f9;
      color: #334155;
    }

    .filter-tab-btn.active {
      background: #10b981;
      color: #fff;
      border-color: #10b981;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
    }

    .divider {
      width: 1px;
      height: 24px;
      background: rgba(0, 0, 0, 0.1);
      margin: 0 8px;
    }

    .month-selector {
      display: flex;
      align-items: center;
    }

    .filter-select {
      border: 1.5px solid rgba(0, 0, 0, 0.05);
      background: #f8fafc;
      padding: 8px 12px;
      border-radius: 10px;
      font-size: 0.85rem;
      font-weight: 600;
      color: #334155;
      cursor: pointer;
      outline: none;
      transition: all 0.25s ease;
      min-width: 130px;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      background-size: 16px;
      padding-right: 32px;
    }

    .filter-select:focus {
      border-color: #10b981;
      background-color: #fff;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
    }

    .filter-select option {
      font-weight: 500;
    }

    .mb-4 { margin-bottom: 1rem; }
    .mt-3 { margin-top: 0.75rem; }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }

    .kpi-card {
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .kpi-card:hover {
      transform: translateY(-5px);
    }

    .kpi-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
    }

    .kpi-icon.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
    .kpi-icon.green { background: rgba(16, 185, 129, 0.1); color: #10b981; }
    .kpi-icon.orange { background: rgba(249, 115, 22, 0.1); color: #f97316; }
    .kpi-icon.yellow { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
    .kpi-icon.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
    .kpi-icon.cyan { background: rgba(6, 182, 212, 0.1); color: #0891b2; }
    .kpi-card.cyan { border-bottom: 3px solid #0891b2; }
    
    .kpi-icon.indigo { background: rgba(79, 70, 229, 0.1); color: #4f46e5; }
    .kpi-card.indigo { border-bottom: 3px solid #4f46e5; }

    .kpi-row-special {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }

    .kpi-content label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
    }

    .kpi-content .value {
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .text-red { color: #ef4444 !important; }
    .text-green { color: #10b981 !important; }

    .charts-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.25rem;
    }

    .chart-container {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      height: 380px;
    }

    .chart-header {
      margin-bottom: 1.25rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .chart-header h3 {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
    }

    .period-label {
      font-size: 0.8rem;
      font-weight: 500;
    }

    .custom-date-row {
      display: flex;
      gap: 1rem;
      padding: 12px 14px;
      background: rgba(0, 0, 0, 0.02);
      border-radius: 12px;
    }

    .date-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .date-field label {
      font-size: 0.7rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .date-field input {
      border: 1.5px solid rgba(0, 0, 0, 0.08);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 0.8rem;
      font-weight: 500;
      background: #fff;
    }

    .canvas-wrapper {
      flex: 1;
      position: relative;
      min-height: 0;
    }

    .doughnut-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    @media (max-width: 1024px) {
      .charts-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 768px) {
      .kpi-row-special { grid-template-columns: 1fr; }
      .chart-container { height: 320px; }
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('salesChart') salesChartRef!: ElementRef;
  @ViewChild('inventoryChart') inventoryChartRef!: ElementRef;

  months = [
    { label: 'Tháng 1', val: 1 },
    { label: 'Tháng 2', val: 2 },
    { label: 'Tháng 3', val: 3 },
    { label: 'Tháng 4', val: 4 },
    { label: 'Tháng 5', val: 5 },
    { label: 'Tháng 6', val: 6 },
    { label: 'Tháng 7', val: 7 },
    { label: 'Tháng 8', val: 8 },
    { label: 'Tháng 9', val: 9 },
    { label: 'Tháng 10', val: 10 },
    { label: 'Tháng 11', val: 11 },
    { label: 'Tháng 12', val: 12 }
  ];

  selectedPeriod = 'all';
  customStartDate = '';
  customEndDate = '';
  isLoading = false;

  stats = {
    totalRevenue: 0,
    totalPaid: 0,
    totalProfit: 0,
    totalDebt: 0,
    soldCount: 0,
    inventoryCount: 0,
    totalInventoryValue: 0,
    expectedTotalRevenue: 0
  };

  private salesChart?: Chart;
  private inventoryChart?: Chart;

  constructor(private dataService: DataService) { }

  ngOnInit() {
    this.dataService.products$.subscribe(() => this.calculateStats());
    this.dataService.invoices$.subscribe(() => this.calculateStats());

    // Subscribe to backend stats
    this.dataService.stats$.subscribe(apiStats => {
      if (apiStats) {
        this.stats.soldCount = apiStats.soldCount;
        this.stats.inventoryCount = apiStats.inventoryCount;
        this.stats.totalRevenue = apiStats.totalRevenue;
        this.stats.totalPaid = apiStats.totalPaid;
        this.stats.totalDebt = apiStats.totalDebt;
        this.stats.totalInventoryValue = apiStats.totalCapital;
        this.stats.expectedTotalRevenue = apiStats.totalExpectedRevenue;
        this.stats.totalProfit = (apiStats as any).totalProfit || 0;
        this.isLoading = false;

        // Cập nhật biểu đồ nếu đã khởi tạo
        if (this.inventoryChart) {
          this.inventoryChart.data.datasets[0].data = [this.stats.soldCount, this.stats.inventoryCount];
          this.inventoryChart.update();
        }
        this.updateSalesChart();
      }
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initSalesChart();
      this.initInventoryChart();
      // Chạy lại tính toán/cập nhật chart sau khi đã init xong canvas
      this.calculateStats();
    }, 150);
  }

  private calculateStats() {
    // Không cần tính lại nữa vì stats đã được cập nhật từ API
    this.updateSalesChart();
    this.updateInventoryChart();
  }

  onPeriodChange(period: string) {
    this.selectedPeriod = period;
    let start = '';
    let end = '';

    const today = new Date();
    const currentYear = today.getFullYear();

    if (period === 'all') {
      // API mặc định là toàn bộ nếu không truyền params
    } else if (period === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      start = this.toISODate(d);
      end = this.toISODate(today);
    } else if (period === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      start = this.toISODate(d);
      end = this.toISODate(today);
    } else if (period.startsWith('month-')) {
      const month = parseInt(period.split('-')[1], 10);
      const firstDay = new Date(currentYear, month - 1, 1);
      const lastDay = new Date(currentYear, month, 0);
      start = this.toISODate(firstDay);
      end = this.toISODate(lastDay);
    } else if (period === 'custom') {
      if (!this.customStartDate || !this.customEndDate) {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        this.customStartDate = this.toISODate(d);
        this.customEndDate = this.toISODate(today);
      }
      start = this.customStartDate;
      end = this.customEndDate;
    }

    // Luôn gọi API để lấy số liệu KPI mới nhất
    this.isLoading = true;
    this.dataService.getDashboardStats(start, end).subscribe({
      error: () => this.isLoading = false
    });
  }

  onMonthSelect(event: any) {
    const value = event.target.value;
    if (value) {
      this.onPeriodChange(value);
    }
  }

  onCustomDateChange() {
    if (this.customStartDate && this.customEndDate) {
      this.isLoading = true;
      this.dataService.getDashboardStats(this.customStartDate, this.customEndDate).subscribe({
        error: () => this.isLoading = false
      });
    }
  }

  getSelectedMonth(): string {
    return this.selectedPeriod.startsWith('month-') ? this.selectedPeriod : '';
  }

  getPeriodLabel(): string {
    if (this.selectedPeriod === 'all') return 'Toàn bộ thời gian';
    if (this.selectedPeriod === '7d') return '7 ngày gần nhất';
    if (this.selectedPeriod === '30d') return '30 ngày gần nhất';
    if (this.selectedPeriod.startsWith('month-')) {
      const m = this.selectedPeriod.split('-')[1];
      return `Tháng ${m} / ${new Date().getFullYear()}`;
    }
    return '';
  }

  private toISODate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  private getDaysCount(): number {
    switch (this.selectedPeriod) {
      case '3d': return 3;
      case '7d': return 7;
      case '1m': return 30;
      default: return 7;
    }
  }

  private initSalesChart() {
    const ctx = this.salesChartRef.nativeElement.getContext('2d');
    const { labels, data } = this.getChartDataForPeriod();

    this.salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Doanh thu (đ)',
          data,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { size: 10 } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } }
          }
        }
      }
    });
  }

  private updateSalesChart() {
    if (!this.salesChart) return;
    const { labels, data } = this.getChartDataForPeriod();
    this.salesChart.data.labels = labels;
    this.salesChart.data.datasets[0].data = data;
    this.salesChart.update();
  }

  private getChartDataForPeriod(): { labels: string[], data: number[] } {
    let startDate: Date;
    let endDate: Date;
    const today = new Date();
    const currentYear = today.getFullYear();

    if (this.selectedPeriod === 'all') {
      // Đối với "tất cả", ta hiển thị 30 ngày gần nhất trên biểu đồ để biểu đồ không bị quá dày
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return this.buildChartDataFromRange(start, today);
    } else if (this.selectedPeriod === '7d') {
      const start = new Date();
      start.setDate(start.getDate() - 6);
      return this.buildChartDataFromRange(start, today);
    } else if (this.selectedPeriod === '30d') {
      const start = new Date();
      start.setDate(start.getDate() - 29);
      return this.buildChartDataFromRange(start, today);
    } else if (this.selectedPeriod.startsWith('month-')) {
      const month = parseInt(this.selectedPeriod.split('-')[1], 10);
      startDate = new Date(currentYear, month - 1, 1);
      endDate = new Date(currentYear, month, 0);
      return this.buildChartDataFromRange(startDate, endDate);
    } else if (this.selectedPeriod === 'custom' && this.customStartDate && this.customEndDate) {
      return this.buildChartDataFromRange(new Date(this.customStartDate), new Date(this.customEndDate));
    }
    
    return { labels: [], data: [] };
  }

  private buildChartData(days: number): { labels: string[], data: number[] } {
    // Không dùng nữa vì đã có buildChartDataFromRange
    return { labels: [], data: [] };
  }

  private buildChartDataFromRange(start: Date, end: Date): { labels: string[], data: number[] } {
    const labels: string[] = [];
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);

    while (current <= endDate) {
      labels.push(current.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }));
      current.setDate(current.getDate() + 1);
    }

    const data = labels.map(dateStr => {
      return this.dataService.getInvoices()
        .filter(inv => !inv.id.startsWith('MANUAL-'))
        .reduce((sum, inv) => {
          const invDate = new Date(inv.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
          return invDate === dateStr ? sum + (inv.totalAmount || inv.productPrice || 0) : sum;
        }, 0);
    });

    return { labels, data };
  }

  private initInventoryChart() {
    const ctx = this.inventoryChartRef.nativeElement.getContext('2d');
    this.inventoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Đã bán', 'Tồn kho'],
        datasets: [{
          data: [this.stats.soldCount, this.stats.inventoryCount],
          backgroundColor: ['#10b981', '#f1f5f9'],
          borderWidth: 0
        }]
      },
      options: {
        cutout: '75%',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, padding: 20, font: { weight: 'bold' } }
          }
        }
      }
    });
  }

  private updateInventoryChart() {
    if (!this.inventoryChart) return;
    this.inventoryChart.data.datasets[0].data = [this.stats.soldCount, this.stats.inventoryCount];
    this.inventoryChart.update();
  }
}
