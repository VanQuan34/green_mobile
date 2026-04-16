import SwiftUI
import Charts

enum DashboardFilter: String, CaseIterable {
    case all = "Toàn bộ"
    case sevenDays = "7 ngày"
    case thirtyDays = "30 ngày"
    case custom = "Tùy chọn"
}

struct DashboardView: View {
    @EnvironmentObject var dataManager: DataManager
    @State private var selectedFilter: DashboardFilter = .all
    @State private var selectedMonth: Int = Calendar.current.component(.month, from: Date())
    @State private var customStartDate = Date().addingTimeInterval(-86400 * 30)
    @State private var customEndDate = Date()
    @State private var showCustomDatePicker = false
    
    // Helper to format Date to yyyy-MM-dd
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
    
    private func updateData() {
        Task {
            let calendar = Calendar.current
            let today = Date()
            
            var from: String? = nil
            var to: String? = nil
            
            switch selectedFilter {
            case .all:
                break
            case .sevenDays:
                if let date = calendar.date(byAdding: .day, value: -7, to: today) {
                    from = formatDate(date)
                    to = formatDate(today)
                }
            case .thirtyDays:
                if let date = calendar.date(byAdding: .day, value: -30, to: today) {
                    from = formatDate(date)
                    to = formatDate(today)
                }
            case .custom:
                from = formatDate(customStartDate)
                to = formatDate(customEndDate)
            }
            
            await dataManager.fetchDashboardStats(fromDate: from, toDate: to)
        }
    }
    
    private func updateMonthData(_ month: Int) {
        Task {
            let calendar = Calendar.current
            let year = calendar.component(.year, from: Date())
            var components = DateComponents(year: year, month: month, day: 1)
            
            if let startOfMonth = calendar.date(from: components),
               let range = calendar.range(of: .day, in: .month, for: startOfMonth) {
                let endOfMonth = calendar.date(byAdding: .day, value: range.count - 1, to: startOfMonth)!
                
                await dataManager.fetchDashboardStats(
                    fromDate: formatDate(startOfMonth),
                    toDate: formatDate(endOfMonth)
                )
            }
        }
    }
    
    var body: some View {
        NavigationView {
            ZStack {
                Color(hex: "#F8FAFC").ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: 20) {
                        // Time Filter Section
                        TimeFilterSection(
                            selectedFilter: $selectedFilter,
                            selectedMonth: $selectedMonth,
                            customStartDate: $customStartDate,
                            customEndDate: $customEndDate,
                            showCustomDatePicker: $showCustomDatePicker,
                            onFilterChange: updateData,
                            onMonthChange: updateMonthData
                        )
                        
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
                    if selectedFilter == .custom {
                        updateData()
                    } else if selectedFilter == .all && selectedMonth != 0 {
                        // If a month was selected, we might want to refresh that, 
                        // but usually pull-to-refresh resets to initial data.
                        // Let's keep current context.
                        updateData()
                    } else {
                        await dataManager.fetchInitialData()
                    }
                }
                
                // Loading Overlay
                if dataManager.isLoading {
                    ZStack {
                        Color.white.opacity(0.6)
                            .ignoresSafeArea()
                        
                        VStack(spacing: 15) {
                            ProgressView()
                                .scaleEffect(1.2)
                                .accentColor(AppTheme.primary)
                            
                            Text("Đang cập nhật...")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.secondary)
                        }
                        .padding(25)
                        .background(Color.white)
                        .cornerRadius(20)
                        .shadow(color: Color.black.opacity(0.1), radius: 20, x: 0, y: 10)
                    }
                    .transition(.opacity.combined(with: .scale(scale: 0.95)))
                    .zIndex(10)
                }
            }
            .animation(.easeInOut, value: dataManager.isLoading)
            .navigationTitle("Thống kê")
            .onAppear {
                // Fetch initial data if not already loading
                if !dataManager.isLoading {
                    updateData()
                }
            }
            .onChange(of: customStartDate) { _ in if selectedFilter == .custom { updateData() } }
            .onChange(of: customEndDate) { _ in if selectedFilter == .custom { updateData() } }
        }
    }
}

struct TimeFilterSection: View {
    @Binding var selectedFilter: DashboardFilter
    @Binding var selectedMonth: Int
    @Binding var customStartDate: Date
    @Binding var customEndDate: Date
    @Binding var showCustomDatePicker: Bool
    
    var onFilterChange: () -> Void
    var onMonthChange: (Int) -> Void
    
    let months = [
        "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
        "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
    ]
    
    var body: some View {
        VStack(spacing: 12) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    ForEach(DashboardFilter.allCases, id: \.self) { filter in
                        Button(action: {
                            selectedFilter = filter
                            onFilterChange()
                        }) {
                            Text(filter.rawValue)
                                .font(.system(size: 14, weight: .medium))
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(selectedFilter == filter ? AppTheme.primary : Color.white)
                                .foregroundColor(selectedFilter == filter ? .white : .secondary)
                                .cornerRadius(20)
                                .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                        }
                    }
                    
                    Divider().frame(height: 20)
                    
                    // Month Picker
                    Menu {
                        ForEach(1...12, id: \.self) { month in
                            Button(months[month-1]) {
                                selectedMonth = month
                                selectedFilter = .all // Reset tab
                                onMonthChange(month)
                            }
                        }
                    } label: {
                        HStack {
                            Text(months[selectedMonth-1])
                            Image(systemName: "chevron.down")
                                .font(.system(size: 10))
                        }
                        .font(.system(size: 14, weight: .medium))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.white)
                        .foregroundColor(.secondary)
                        .cornerRadius(20)
                        .shadow(color: Color.black.opacity(0.05), radius: 5, x: 0, y: 2)
                    }
                }
                .padding(.horizontal, 2)
                .padding(.vertical, 5)
            }
            
            if selectedFilter == .custom {
                HStack {
                    DatePicker("", selection: $customStartDate, displayedComponents: .date)
                        .labelsHidden()
                        .datePickerStyle(.compact)
                    
                    Text("→")
                        .foregroundColor(.secondary)
                    
                    DatePicker("", selection: $customEndDate, displayedComponents: .date)
                        .labelsHidden()
                        .datePickerStyle(.compact)
                }
                .padding(.top, 5)
                .transition(.move(edge: .top).combined(with: .opacity))
            }
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
