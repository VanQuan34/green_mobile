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
      <!-- KPI Cards -->
      <div class="kpi-grid">
        <div class="kpi-card glass-card">
          <div class="kpi-icon blue">💰</div>
          <div class="kpi-content">
            <label>Tổng doanh thu</label>
            <div class="value">{{ stats.totalRevenue | number }}đ</div>
          </div>
        </div>
        <div class="kpi-card glass-card">
          <div class="kpi-icon green">✅</div>
          <div class="kpi-content">
            <label>Thực thu (Đã trả)</label>
            <div class="value">{{ stats.totalPaid | number }}đ</div>
          </div>
        </div>
        <div class="kpi-card glass-card">
          <div class="kpi-icon orange">📈</div>
          <div class="kpi-content">
            <label>Lợi nhuận dự kiến</label>
            <div class="value text-green">{{ stats.totalProfit | number }}đ</div>
          </div>
        </div>
        <div class="kpi-card glass-card">
          <div class="kpi-icon yellow">⏳</div>
          <div class="kpi-content">
            <label>Tổng công nợ</label>
            <div class="value text-red">{{ stats.totalDebt | number }}đ</div>
          </div>
        </div>
        <div class="kpi-card glass-card">
          <div class="kpi-icon purple">📱</div>
          <div class="kpi-content">
            <label>Máy đã bán / Tồn</label>
            <div class="value">{{ stats.soldCount }} / {{ stats.inventoryCount }}</div>
          </div>
        </div>
      </div>

      <!-- Special KPI Row -->
      <div class="kpi-row-special">
        <div class="kpi-card glass-card cyan">
          <div class="kpi-icon cyan">📊</div>
          <div class="kpi-content">
            <label>Tổng vốn (Giá gốc)</label>
            <div class="value">{{ stats.totalInventoryValue | number }}đ</div>
          </div>
        </div>
        <div class="kpi-card glass-card indigo">
          <div class="kpi-icon indigo">🎯</div>
          <div class="kpi-content">
            <label>Doanh thu dự kiến (Nếu bán hết)</label>
            <div class="value">{{ stats.expectedTotalRevenue | number }}đ</div>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-grid">
        <div class="chart-container glass-card">
          <div class="chart-header">
            <h3>Xu hướng doanh thu</h3>
            <div class="period-selector">
              <button 
                *ngFor="let p of periods" 
                class="period-btn" 
                [class.active]="selectedPeriod === p.value"
                (click)="onPeriodChange(p.value)">
                {{ p.label }}
              </button>
              <button 
                class="period-btn" 
                [class.active]="selectedPeriod === 'custom'"
                (click)="onPeriodChange('custom')">
                📅 Tùy chọn
              </button>
            </div>
          </div>
          <div class="custom-date-row" *ngIf="selectedPeriod === 'custom'">
            <div class="date-field">
              <label>Từ ngày</label>
              <input type="date" [ngModel]="customStartDate" (ngModelChange)="onCustomDateChange($event, 'start')" />
            </div>
            <div class="date-field">
              <label>Đến ngày</label>
              <input type="date" [ngModel]="customEndDate" (ngModelChange)="onCustomDateChange($event, 'end')" />
            </div>
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
      gap: 2rem;
      padding-bottom: 2rem;
    }

    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
    }

    .kpi-card {
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1.25rem;
      transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .kpi-card:hover {
      transform: translateY(-5px);
    }

    .kpi-icon {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
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
      display: flex;
      gap: 1.5rem;
      justify-content: flex-start;
    }

    .kpi-row-special .kpi-card {
      flex: 1;
      max-width: calc(50% - 0.75rem);
    }

    .kpi-content label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 0.25rem;
    }

    .kpi-content .value {
      font-size: 1.25rem;
      font-weight: 800;
      color: var(--text-main);
    }

    .text-red { color: #ef4444 !important; }
    .text-green { color: #10b981 !important; }

    .charts-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 1.5rem;
    }

    .chart-container {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      height: 400px;
    }

    .chart-header {
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.75rem;
    }

    .chart-header h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-main);
      margin: 0;
    }

    .period-selector {
      display: flex;
      gap: 4px;
      background: rgba(0, 0, 0, 0.04);
      border-radius: 10px;
      padding: 3px;
    }

    .period-btn {
      border: none;
      background: transparent;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.25s ease;
      white-space: nowrap;
    }

    .period-btn:hover {
      color: var(--text-main);
      background: rgba(0, 0, 0, 0.04);
    }

    .period-btn.active {
      background: #10b981;
      color: #fff;
      box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
    }

    .custom-date-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
      padding: 12px 14px;
      background: rgba(0, 0, 0, 0.02);
      border-radius: 10px;
      animation: slideDown 0.25s ease;
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .date-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .date-field label {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--text-muted);
    }

    .date-field input {
      border: 1.5px solid rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-main);
      background: #fff;
      outline: none;
      transition: border-color 0.2s ease;
    }

    .date-field input:focus {
      border-color: #10b981;
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
      .charts-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .dashboard-page {
        gap: 1rem;
      }
      .chart-container {
        height: 300px;
      }
      .kpi-row-special .kpi-card {
        width: 100%;
      }
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('salesChart') salesChartRef!: ElementRef;
  @ViewChild('inventoryChart') inventoryChartRef!: ElementRef;

  periods = [
    { label: '3 ngày', value: '3d' },
    { label: '7 ngày', value: '7d' },
    { label: '1 tháng', value: '1m' }
  ];
  selectedPeriod = '7d';
  customStartDate = '';
  customEndDate = '';

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

        // Cập nhật biểu đồ nếu đã khởi tạo
        if (this.inventoryChart) {
          this.inventoryChart.data.datasets[0].data = [this.stats.soldCount, this.stats.inventoryCount];
          this.inventoryChart.update();
        }
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
    const rawInvoices = this.dataService.getInvoices();
    const products = this.dataService.getProducts();

    // Tách hóa đơn thực tế và nợ nhập ngoài
    const actualInvoices = rawInvoices.filter(i => !i.id.startsWith('MANUAL-'));
    const manualInvoices = rawInvoices.filter(i => i.id.startsWith('MANUAL-'));

    // Doanh thu và Thực thu chỉ tính hóa đơn thực tế
    this.stats.totalRevenue = actualInvoices.reduce((sum, i) => sum + (i.totalAmount || i.productPrice || 0), 0);
    this.stats.totalPaid = actualInvoices.reduce((sum, i) => sum + i.amountPaid, 0);

    // Tổng công nợ bao gồm cả hóa đơn thực tế và nợ nhập ngoài
    // this.stats.totalDebt = rawInvoices.reduce((sum, i) => sum + i.debt, 0); // Ưu tiên số từ API

    // Đếm tổng số máy đã bán (Chỉ máy thực tế)
    // this.stats.soldCount = actualInvoices.reduce((sum, inv) => sum + (inv.products?.length || 1), 0); // Ưu tiên số từ API
    const unsoldProducts = products.filter(p => !p.sale);
    // this.stats.inventoryCount = unsoldProducts.length; // Ưu tiên số từ API

    // Tổng vốn = Tổng giá gốc của các sản phẩm chưa bán + Tổng giá gốc của các sản phẩm TRONG HÓA ĐƠN THỰC TẾ
    const unsoldCapital = unsoldProducts.reduce((sum, p) => sum + (p.originalPrice || 0), 0);
    const soldCapital = actualInvoices.reduce((sum, inv) => {
      if (inv.products && inv.products.length > 0) {
        return sum + inv.products.reduce((s, p) => s + (p.originalPrice || 0), 0);
      } else {
        // Fallback cho hóa đơn cũ
        const product = products.find(p => p.id === inv.productId);
        return sum + (product ? (product.originalPrice || 0) : 0);
      }
    }, 0);

    // Doanh thu dự kiến = Doanh thu thực tế (đã bán) + Tổng giá bán sản phẩm trong kho (chưa bán)
    // ƯU TIÊN: Nếu có dữ liệu từ API, ta không ghi đè các trường tổng vốn và doanh thu dự kiến vì API có dữ liệu toàn bộ lịch sử
    const apiStats = this.dataService.getLatestStats();
    if (apiStats) {
      this.stats.totalInventoryValue = apiStats.totalCapital;
      this.stats.expectedTotalRevenue = apiStats.totalExpectedRevenue;
    } else {
      // Fallback nếu chưa có API (chỉ tính được dựa trên dữ liệu hiện có trong app)
      const currentUnsoldRevenue = unsoldProducts.reduce((sum, p) => sum + (p.sellingPrice || 0), 0);
      this.stats.totalInventoryValue = unsoldCapital + soldCapital;
      this.stats.expectedTotalRevenue = this.stats.totalRevenue + currentUnsoldRevenue;
    }

    // Tính lợi nhuận: Chỉ tính trên hóa đơn thực tế
    this.stats.totalProfit = actualInvoices.reduce((sum, inv) => {
      const revenue = inv.totalAmount || inv.productPrice || 0;
      let cost = 0;
      if (inv.products && inv.products.length > 0) {
        cost = inv.products.reduce((s, p) => s + (p.originalPrice || 0), 0);
      } else {
        // Fallback cho hóa đơn cũ
        const product = products.find(p => p.id === inv.productId);
        cost = product ? product.originalPrice : 0;
      }
      return sum + (revenue - cost);
    }, 0);

    // Cập nhật chart nếu đã được khởi tạo
    this.updateSalesChart();
    this.updateInventoryChart();
  }

  onPeriodChange(period: string) {
    this.selectedPeriod = period;
    if (period === 'custom') {
      // Set default custom dates: last 7 days
      if (!this.customStartDate || !this.customEndDate) {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 6);
        this.customStartDate = this.toISODate(start);
        this.customEndDate = this.toISODate(end);
      }
    }
    this.updateSalesChart();
  }

  onCustomDateChange(value: string, type: 'start' | 'end') {
    if (type === 'start') this.customStartDate = value;
    else this.customEndDate = value;
    if (this.customStartDate && this.customEndDate) {
      this.updateSalesChart();
    }
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
    if (this.selectedPeriod === 'custom' && this.customStartDate && this.customEndDate) {
      return this.buildChartDataFromRange(new Date(this.customStartDate), new Date(this.customEndDate));
    }
    return this.buildChartData(this.getDaysCount());
  }

  private buildChartData(days: number): { labels: string[], data: number[] } {
    const labels = [...Array(days)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    }).reverse();

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
