import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../services/data.service';
import { Product, Invoice } from '../../models/data.models';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
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

      <!-- Charts Section -->
      <div class="charts-grid">
        <div class="chart-container glass-card">
          <div class="chart-header">
            <h3>Xu hướng doanh thu (7 ngày)</h3>
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
    .kpi-icon.yellow { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
    .kpi-icon.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }

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
    }

    .chart-header h3 {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-main);
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
    }
  `]
})
export class DashboardComponent implements OnInit, AfterViewInit {
  @ViewChild('salesChart') salesChartRef!: ElementRef;
  @ViewChild('inventoryChart') inventoryChartRef!: ElementRef;

  stats = {
    totalRevenue: 0,
    totalPaid: 0,
    totalDebt: 0,
    soldCount: 0,
    inventoryCount: 0
  };

  private salesChart?: Chart;
  private inventoryChart?: Chart;

  constructor(private dataService: DataService) {}

  ngOnInit() {
    this.calculateStats();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initSalesChart();
      this.initInventoryChart();
    }, 100);
  }

  private calculateStats() {
    const invoices = this.dataService.getInvoices();
    const products = this.dataService.getProducts();

    this.stats.totalRevenue = invoices.reduce((sum, i) => sum + i.productPrice, 0);
    this.stats.totalPaid = invoices.reduce((sum, i) => sum + i.amountPaid, 0);
    this.stats.totalDebt = invoices.reduce((sum, i) => sum + i.debt, 0);
    this.stats.soldCount = invoices.length;
    this.stats.inventoryCount = products.filter(p => !p.sale).length;
  }

  private initSalesChart() {
    const ctx = this.salesChartRef.nativeElement.getContext('2d');
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    }).reverse();

    const revenueData = last7Days.map(dateStr => {
      return this.dataService.getInvoices().reduce((sum, inv) => {
        const invDate = new Date(inv.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        return invDate === dateStr ? sum + inv.productPrice : sum;
      }, 0);
    });

    this.salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: last7Days,
        datasets: [{
          label: 'Doanh thu (đ)',
          data: revenueData,
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
}
