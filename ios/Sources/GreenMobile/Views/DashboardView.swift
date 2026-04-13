import SwiftUI
import Charts

struct DashboardView: View {
    @EnvironmentObject var dataManager: DataManager
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "#F8FAFC").ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 20) {
                        // 1. Primary Metrics (KPI Grid)
                        KPISection()
                        
                        // 2. Financial Metrics (Special Row)
                        FinancialSection()
                        
                        // 3. Charts Section
                        ChartsSection()
                    }
                    .padding()
                }
                .refreshable {
                    await dataManager.fetchInitialData()
                }
                
                // Loading Overlay
                if dataManager.isLoading && dataManager.invoices.isEmpty {
                    VStack {
                        ProgressView()
                            .scaleEffect(1.5)
                        Text("Đang tải dữ liệu...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.top, 10)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .background(Color.white.opacity(0.8))
                }
            }
            .navigationTitle("Thống kê")
        }
    }
}

// MARK: - KPI Section
struct KPISection: View {
    @EnvironmentObject var dataManager: DataManager
    
    let columns = [
        GridItem(.flexible()),
        GridItem(.flexible())
    ]
    
    var body: some View {
        LazyVGrid(columns: columns, spacing: 15) {
            KPICard(title: "Tổng doanh thu", 
                    value: dataManager.dashboardStats.totalRevenue.formatVND(), 
                    icon: "dollarsign.circle.fill", 
                    color: .blue)
            
            KPICard(title: "Thực thu (Đã trả)", 
                    value: dataManager.dashboardStats.totalPaid.formatVND(), 
                    icon: "checkmark.circle.fill", 
                    color: .green)
            
            KPICard(title: "Lợi nhuận dự kiến", 
                    value: dataManager.dashboardStats.totalProfit.formatVND(), 
                    icon: "chart.line.uptrend.xyaxis", 
                    color: .orange)
            
            KPICard(title: "Tổng công nợ", 
                    value: dataManager.dashboardStats.totalDebt.formatVND(), 
                    icon: "clock.fill", 
                    color: .red)
            
            KPICard(title: "Máy đã bán / Tồn", 
                    value: "\(dataManager.dashboardStats.soldCount) / \(dataManager.dashboardStats.inventoryCount)", 
                    icon: "iphone", 
                    color: .purple)
        }
    }
}

// MARK: - Financial Section
struct FinancialSection: View {
    @EnvironmentObject var dataManager: DataManager
    
    var body: some View {
        VStack(spacing: 15) {
            HStack(spacing: 15) {
                KPICard(title: "Tổng vốn (Giá gốc)", 
                        value: dataManager.dashboardStats.totalCapital.formatVND(), 
                        icon: "briefcase.fill", 
                        color: .cyan)
                
                KPICard(title: "Doanh thu dự kiến", 
                        value: dataManager.dashboardStats.expectedTotalRevenue.formatVND(), 
                        icon: "target", 
                        color: .indigo)
            }
        }
    }
}

// MARK: - Charts Section
struct ChartsSection: View {
    @EnvironmentObject var dataManager: DataManager
    
    var body: some View {
        VStack(spacing: 20) {
            // Sales Trend Chart
            VStack(alignment: .leading) {
                Text("Xu hướng doanh thu (7 ngày)")
                    .font(.headline)
                    .padding(.bottom, 10)
                
                Chart {
                    let sortedDates = dataManager.dashboardStats.last7DaysRevenue.keys.sorted()
                    ForEach(sortedDates, id: \.self) { date in
                        AreaMark(
                            x: .value("Ngày", date, unit: .day),
                            y: .value("Doanh thu", dataManager.dashboardStats.last7DaysRevenue[date] ?? 0)
                        )
                        .foregroundStyle(AppTheme.primary.opacity(0.1).gradient)
                        .interpolationMethod(.catmullRom)
                        
                        LineMark(
                            x: .value("Ngày", date, unit: .day),
                            y: .value("Doanh thu", dataManager.dashboardStats.last7DaysRevenue[date] ?? 0)
                        )
                        .foregroundStyle(AppTheme.primary)
                        .interpolationMethod(.catmullRom)
                        .symbol(Circle())
                    }
                }
                .frame(height: 200)
                .chartXAxis {
                    AxisMarks(values: .stride(by: .day)) { value in
                        AxisValueLabel(format: .dateTime.day().month())
                    }
                }
                .chartYAxis {
                    AxisMarks { value in
                        AxisValueLabel {
                            if let intValue = value.as(Int.self) {
                                Text("\(intValue / 1000000)M")
                            }
                        }
                    }
                }
            }
            .padding()
            .background(Color.white)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 5)
            
            // Inventory Chart
            VStack(alignment: .leading) {
                Text("Tỷ lệ kho hàng")
                    .font(.headline)
                    .padding(.bottom, 10)
                
                HStack {
                    Chart {
                        BarMark(
                            x: .value("Số lượng", dataManager.dashboardStats.soldCount),
                            stacking: .normalized
                        )
                        .foregroundStyle(AppTheme.primary)
                        
                        BarMark(
                            x: .value("Số lượng", dataManager.dashboardStats.inventoryCount),
                            stacking: .normalized
                        )
                        .foregroundStyle(Color(uiColor: .systemGray6))
                    }
                    .frame(height: 50)
                    .chartXAxis(.hidden)
                    
                    VStack(alignment: .leading, spacing: 10) {
                        LegendRow(color: AppTheme.primary, label: "Đã bán", value: "\(dataManager.dashboardStats.soldCount)")
                        LegendRow(color: Color(uiColor: .systemGray4), label: "Tồn kho", value: "\(dataManager.dashboardStats.inventoryCount)")
                    }
                    .padding(.leading, 20)
                }
            }
            .padding()
            .background(Color.white)
            .cornerRadius(16)
            .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 5)
        }
    }
}

// MARK: - Subviews
struct KPICard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(color)
                .padding(10)
                .background(color.opacity(0.1))
                .cornerRadius(12)
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)
                
                Text(value)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(AppTheme.textMain)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 10, x: 0, y: 5)
    }
}

struct LegendRow: View {
    let color: Color
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            Text(label)
                .font(.caption)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.caption)
                .fontWeight(.bold)
        }
    }
}

#Preview {
    DashboardView().environmentObject(DataManager.shared)
}
