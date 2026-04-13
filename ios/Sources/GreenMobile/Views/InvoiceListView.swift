import SwiftUI

struct InvoiceListView: View {
    @EnvironmentObject var dataManager: DataManager
    @State private var isShowingCreateInvoice = false
    @State private var searchText = ""
    @State private var selectedFilter: InvoiceFilter = .all
    
    enum InvoiceFilter: String, CaseIterable {
        case all = "Tất cả"
        case paid = "Đã trả hết"
        case debt = "Còn nợ"
    }
    
    private var counts: [InvoiceFilter: Int] {
        var counts: [InvoiceFilter: Int] = [:]
        counts[.all] = dataManager.invoices.count
        counts[.paid] = dataManager.invoices.filter { $0.isFullyPaid == true }.count
        counts[.debt] = dataManager.invoices.filter { $0.isFullyPaid != true }.count
        return counts
    }
    
    var filteredInvoices: [Invoice] {
        var result = dataManager.invoices
        if selectedFilter == .paid {
            result = result.filter { $0.isFullyPaid == true }
        } else if selectedFilter == .debt {
            result = result.filter { $0.isFullyPaid != true }
        }
        
        if !searchText.isEmpty {
            result = result.filter {
                $0.buyerName.localizedCaseInsensitiveContains(searchText) ||
                $0.buyerPhone.contains(searchText)
            }
        }
        return result
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                Picker("Lọc hóa đơn", selection: $selectedFilter) {
                    ForEach(InvoiceFilter.allCases, id: \.self) { filter in
                        Text("\(filter.rawValue) (\(counts[filter] ?? 0))")
                            .tag(filter)
                    }
                }
                .pickerStyle(SegmentedPickerStyle())
                .padding()
                .background(Color(UIColor.systemGroupedBackground))
                
                List(filteredInvoices) { invoice in
                    NavigationLink(destination: InvoiceDetailView(invoice: invoice)) {
                        VStack(alignment: .leading, spacing: 5) {
                            HStack {
                                Text(invoice.buyerName)
                                    .font(.headline)
                                Spacer()
                                Text(invoice.totalAmount.formatVND())
                                    .fontWeight(.bold)
                                    .foregroundColor(AppTheme.primary)
                            }
                            
                            HStack {
                                Label(invoice.buyerPhone, systemImage: "phone")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Spacer()
                                
                                if invoice.isFullyPaid == true {
                                    Text("Đã thanh toán")
                                        .font(.caption2)
                                        .fontWeight(.bold)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(AppTheme.success.opacity(0.1))
                                        .foregroundColor(AppTheme.success)
                                        .cornerRadius(6)
                                } else {
                                    let debtAmount = invoice.debt ?? 0
                                    Text("Còn nợ: \(debtAmount.formatVND())")
                                        .font(.caption2)
                                        .fontWeight(.bold)
                                        .padding(.horizontal, 8)
                                        .padding(.vertical, 4)
                                        .background(AppTheme.danger.opacity(0.1))
                                        .foregroundColor(AppTheme.danger)
                                        .cornerRadius(6)
                                }
                            }
                            
                            if let products = invoice.products, !products.isEmpty {
                                VStack(alignment: .leading, spacing: 2) {
                                    ForEach(Array(products.prefix(2).enumerated()), id: \.offset) { index, product in
                                        Text("• \(product.name)")
                                            .font(.system(size: 11))
                                            .foregroundColor(.secondary)
                                    }
                                    if products.count > 2 {
                                        Text("... và \(products.count - 2) sản phẩm khác")
                                            .font(.system(size: 10))
                                            .fontWeight(.bold)
                                            .foregroundColor(AppTheme.primary)
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(AppTheme.primary.opacity(0.1))
                                            .cornerRadius(4)
                                            .padding(.leading, 8)
                                    }
                                }
                                .padding(.top, 2)
                            }
                            
                            Text(invoice.formattedDate)
                                .font(.system(size: 10))
                                .foregroundColor(.gray)
                        }
                    }
                    .padding(.vertical, 4)
                }
                .listStyle(PlainListStyle())
            }
            .navigationTitle("Hóa đơn")
            .searchable(text: $searchText, prompt: "Tìm tên hoặc SĐT khách hàng")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { isShowingCreateInvoice = true }) {
                        Image(systemName: "square.and.pencil")
                    }
                }
            }
            .refreshable {
                await dataManager.fetchInvoices()
            }
            .sheet(isPresented: $isShowingCreateInvoice) {
                InvoiceFormView(products: [])
            }
        }
    }
}

struct InvoiceDetailView: View {
    let invoice: Invoice
    @State private var isShowingEditForm = false
    
    var body: some View {
        List {
            Section(header: Text("Thông tin khách hàng")) {
                InfoRow(label: "Tên:", value: invoice.buyerName)
                InfoRow(label: "Số điện thoại:", value: invoice.buyerPhone)
                InfoRow(label: "Địa chỉ:", value: invoice.buyerAddress)
                InfoRow(label: "Ngày lập:", value: invoice.formattedDate)
            }
            
            Section(header: Text("Sản phẩm")) {
                ForEach(invoice.products ?? []) { product in
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(product.name)
                                .font(.system(size: 15, weight: .semibold))
                            
                            Text("IMEI: \(product.imei ?? "N/A")")
                                .font(.system(size: 13))
                                .foregroundColor(.secondary)
                            
                            Text("\(product.capacity ?? "0")GB | \(product.color ?? "Không rõ")")
                                .font(.system(size: 12))
                                .foregroundColor(AppTheme.primary)
                        }
                        Spacer()
                        Text(product.sellingPrice?.formatVND() ?? "0đ")
                    }
                }
            }
            
            Section(header: Text("Thanh toán")) {
                InfoRow(label: "Tổng cộng:", value: invoice.totalAmount.formatVND())
                
                HStack {
                    Text("Đã trả:")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(invoice.amountPaid?.formatVND() ?? "0đ")
                        .foregroundColor(AppTheme.success)
                }
                
                HStack {
                    Text("Còn nợ:")
                        .fontWeight(.bold)
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(invoice.debt?.formatVND() ?? "0đ")
                        .fontWeight(.bold)
                        .foregroundColor(invoice.isFullyPaid == true ? .secondary : AppTheme.danger)
                }
                
                if invoice.isFullyPaid == true {
                    HStack {
                        Spacer()
                        Label("Đã hoàn tất thanh toán", systemImage: "checkmark.circle.fill")
                            .foregroundColor(AppTheme.success)
                            .font(.subheadline)
                            .fontWeight(.bold)
                        Spacer()
                    }.padding(.top, 5)
                }
            }
        }
        .navigationTitle("Chi tiết hóa đơn")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Sửa") {
                    isShowingEditForm = true
                }
                .fontWeight(.semibold)
            }
        }
        .sheet(isPresented: $isShowingEditForm) {
            InvoiceEditView(invoice: invoice)
        }
    }
}

struct InvoiceEditView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    let invoice: Invoice
    
    @State private var amountPaid: String = ""
    @State private var isSaving = false
    @State private var errorMessage: String?
    
    init(invoice: Invoice) {
        self.invoice = invoice
        _amountPaid = State(initialValue: String(invoice.amountPaid ?? 0).formatCurrency())
    }
    
    var totalAmount: Int { invoice.totalAmount }
    
    var debtAmount: Int {
        let cleanPaid = amountPaid.replacingOccurrences(of: ".", with: "")
        let paid = Int(cleanPaid) ?? 0
        return max(0, totalAmount - paid)
    }
    
    var isAmountPaidValid: Bool {
        let cleanPaid = amountPaid.replacingOccurrences(of: ".", with: "")
        let paid = Int(cleanPaid) ?? 0
        return paid <= totalAmount
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Thông tin khách hàng (Không thể sửa)")) {
                    TextField("Tên", text: .constant(invoice.buyerName))
                        .disabled(true)
                        .foregroundColor(.gray)
                    TextField("SĐT", text: .constant(invoice.buyerPhone))
                        .disabled(true)
                        .foregroundColor(.gray)
                }
                
                Section(header: Text("Sản phẩm (Không thể sửa)")) {
                    ForEach(invoice.products ?? []) { product in
                        HStack {
                            Text(product.name)
                                .font(.subheadline)
                                .foregroundColor(.gray)
                            Spacer()
                            Text(product.sellingPrice?.formatVND() ?? "0đ")
                                .font(.caption)
                                .foregroundColor(.gray)
                        }
                    }
                }
                .disabled(true)
                
                Section(header: Text("Thanh toán (Có thể sửa)")) {
                    HStack {
                        Text("Tổng cộng:")
                        Spacer()
                        Text(totalAmount.formatVND()).fontWeight(.bold)
                    }
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        HStack {
                            Text("Khách đã trả:")
                            Spacer()
                            TextField("0", text: $amountPaid)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                                .fontWeight(.semibold)
                                .foregroundColor(AppTheme.success)
                                .onChange(of: amountPaid) { newValue in
                                    amountPaid = newValue.formatCurrency()
                                }
                        }
                        
                        let cleanPaid = amountPaid.replacingOccurrences(of: ".", with: "")
                        if let paidInt = Int(cleanPaid), paidInt > 0 {
                            Text(readVietnameseNumber(paidInt))
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.secondary)
                                .italic()
                        }
                    }
                    
                    if !isAmountPaidValid {
                        Text("Số tiền trả không được vượt quá tổng giá trị (\(totalAmount.formatVND()))")
                            .font(.caption2)
                            .foregroundColor(AppTheme.danger)
                            .padding(.top, 2)
                    }
                    
                    HStack {
                        Text("Số tiền còn nợ:")
                            .foregroundColor(debtAmount > 0 ? AppTheme.danger : .secondary)
                        Spacer()
                        Text(debtAmount.formatVND())
                            .fontWeight(.bold)
                            .foregroundColor(debtAmount > 0 ? AppTheme.danger : .secondary)
                    }
                }
                
                if let error = errorMessage {
                    Section {
                        Text(error).foregroundColor(AppTheme.danger).font(.caption)
                    }
                }
            }
            .navigationTitle("Sửa hóa đơn")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Hủy") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    if isSaving {
                        ProgressView()
                    } else {
                        Button("Lưu") { saveInvoice() }
                            .disabled(!isAmountPaidValid)
                            .fontWeight(.bold)
                    }
                }
            }
        }
    }
    
    private func saveInvoice() {
        isSaving = true
        errorMessage = nil
        
        let cleanPaid = amountPaid.replacingOccurrences(of: ".", with: "")
        let paidInt = Int(cleanPaid) ?? 0
        
        // Create updated invoice object
        let updated = Invoice(
            id: invoice.id,
            buyerName: invoice.buyerName,
            buyerPhone: invoice.buyerPhone,
            buyerAddress: invoice.buyerAddress,
            totalAmount: invoice.totalAmount,
            amountPaid: paidInt,
            debt: invoice.totalAmount - paidInt,
            isFullyPaid: paidInt >= invoice.totalAmount,
            products: invoice.products,
            date: invoice.date,
            createdAt: invoice.createdAt
        )
        
        Task {
            do {
                try await dataManager.updateInvoice(updated)
                await MainActor.run {
                    isSaving = false
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isSaving = false
                    errorMessage = "Lỗi khi cập nhật: \(error.localizedDescription)"
                }
            }
        }
    }
}

// MARK: - Finance UI Components

struct InfoRow: View {
    let label: String
    let value: String
    var body: some View {
        HStack {
            Text(label).foregroundColor(.secondary)
            Spacer()
            Text(value).fontWeight(.medium)
        }
    }
}

struct FinanceDetailRow: View {
    let label: String
    let value: String
    
    var body: some View {
        HStack {
            Text(label)
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .fontWeight(.medium)
        }
    }
}

struct StatCardView: View {
    let title: String
    let value: String
    let subTitle: String
    let color: Color
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption)
                .fontWeight(.bold)
                .foregroundColor(.secondary)
            
            HStack(alignment: .bottom, spacing: 4) {
                Text(value)
                    .font(.system(size: 18, weight: .black, design: .rounded))
                    .foregroundColor(color)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                
                Text(subTitle)
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.secondary)
                    .padding(.bottom, 2)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(color.opacity(0.05))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(color.opacity(0.1), lineWidth: 1)
        )
    }
}

struct DebtRowView: View {
    let debt: CustomerDebt
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(debt.buyerName)
                        .font(.headline)
                    Text(debt.buyerPhone)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                VStack(alignment: .trailing, spacing: 2) {
                    Text(debt.debt.formatVND())
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(AppTheme.danger)
                    
                    Text("\(debt.invoices.count) hóa đơn")
                        .font(.caption2)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.1))
                        .foregroundColor(.blue)
                        .cornerRadius(4)
                }
            }
            
            if !debt.buyerAddress.isEmpty {
                Text(debt.buyerAddress)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Debt Management Views

struct DebtListView: View {
    @EnvironmentObject var dataManager: DataManager
    @State private var searchText = ""
    @State private var sortOrder: SortOrder = .debtDescending
    
    enum SortOrder {
        case debtDescending, debtAscending, nameAscending
    }
    
    var filteredDebts: [CustomerDebt] {
        let allInvoices = dataManager.invoices
        var groups: [String: CustomerDebt] = [:]
        
        for invoice in allInvoices {
            let debtVal = invoice.debt ?? 0
            if debtVal > 0 {
                let key = invoice.buyerPhone.isEmpty ? invoice.buyerName : invoice.buyerPhone
                if var existing = groups[key] {
                    existing.totalAmount += invoice.totalAmount
                    existing.amountPaid += (invoice.amountPaid ?? 0)
                    existing.debt += debtVal
                    existing.invoices.append(invoice)
                    if invoice.dateObject > existing.lastUpdate {
                        existing.lastUpdate = invoice.dateObject
                    }
                    groups[key] = existing
                } else {
                    groups[key] = CustomerDebt(
                        buyerName: invoice.buyerName,
                        buyerPhone: invoice.buyerPhone,
                        buyerAddress: invoice.buyerAddress,
                        totalAmount: invoice.totalAmount,
                        amountPaid: invoice.amountPaid ?? 0,
                        debt: debtVal,
                        invoices: [invoice],
                        lastUpdate: invoice.dateObject
                    )
                }
            }
        }
        
        var result = Array(groups.values)
        if !searchText.isEmpty {
            result = result.filter { 
                $0.buyerName.localizedCaseInsensitiveContains(searchText) ||
                $0.buyerPhone.contains(searchText)
            }
        }
        
        switch sortOrder {
        case .debtDescending: result.sort { $0.debt > $1.debt }
        case .debtAscending: result.sort { $0.debt < $1.debt }
        case .nameAscending: result.sort { $0.buyerName < $1.buyerName }
        }
        return result
    }
    
    var totalDebtAmount: Int {
        filteredDebts.reduce(0) { $0 + $1.debt }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                HStack(spacing: 15) {
                    StatCardView(title: "Khách nợ", value: "\(filteredDebts.count)", subTitle: "Người", color: .orange)
                    StatCardView(title: "Tổng tiền nợ", value: totalDebtAmount.formatVND(), subTitle: "VND", color: AppTheme.danger)
                }
                .padding()
                
                HStack(spacing: 12) {
                    HStack {
                        Image(systemName: "magnifyingglass").foregroundColor(.secondary)
                        TextField("Họ tên, SĐT...", text: $searchText)
                    }
                    .padding(8)
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(8)
                    
                    Menu {
                        Button("Nợ nhiều nhất", action: { sortOrder = .debtDescending })
                        Button("Nợ ít nhất", action: { sortOrder = .debtAscending })
                        Button("Tên A-Z", action: { sortOrder = .nameAscending })
                    } label: {
                        Image(systemName: "line.3.horizontal.decrease.circle").font(.title3)
                    }
                }
                .padding(.horizontal).padding(.bottom, 8)
                
                Divider()
                
                List {
                    if filteredDebts.isEmpty {
                        EmptyDebtView()
                    } else {
                        ForEach(filteredDebts) { debt in
                            NavigationLink(destination: DebtDetailView(customerDebt: debt)) {
                                DebtRowView(debt: debt)
                            }
                        }
                    }
                }
                .listStyle(PlainListStyle())
            }
            .navigationTitle("Quản lý Công nợ")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable { await dataManager.fetchInvoices() }
        }
    }
}

struct EmptyDebtView: View {
    var body: some View {
        HStack {
            Spacer()
            VStack(spacing: 10) {
                Image(systemName: "doc.text.magnifyingglass").font(.system(size: 40)).foregroundColor(.secondary)
                Text("Không có dữ liệu công nợ").foregroundColor(.secondary)
            }
            .padding(.top, 50)
            Spacer()
        }
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
    }
}

struct DebtDetailView: View {
    let customerDebt: CustomerDebt
    
    var body: some View {
        List {
            Section(header: Text("Thông tin khách hàng")) {
                VStack(alignment: .leading, spacing: 5) {
                    Text(customerDebt.buyerName).font(.headline)
                    Text(customerDebt.buyerPhone).font(.subheadline).foregroundColor(.secondary)
                }
                .padding(.vertical, 4)
                
                HStack {
                    Text("Tổng nợ").fontWeight(.bold)
                    Spacer()
                    Text(customerDebt.debt.formatVND()).font(.headline).foregroundColor(AppTheme.danger)
                }
            }
            
            Section(header: Text("Danh sách hóa đơn còn nợ")) {
                ForEach(customerDebt.invoices) { invoice in
                    NavigationLink(destination: InvoiceDetailView(invoice: invoice)) {
                        VStack(alignment: .leading, spacing: 6) {
                            HStack {
                                Text("Đơn hàng #\(invoice.id.suffix(6))").fontWeight(.bold)
                                Spacer()
                                Text(invoice.formattedDate).font(.caption).foregroundColor(.secondary)
                            }
                            HStack {
                                Text("Nợ: \(invoice.debt?.formatVND() ?? "0đ")")
                                    .foregroundColor(AppTheme.danger).font(.subheadline).fontWeight(.semibold)
                                Spacer()
                                Text("Đã trả: \(invoice.amountPaid?.formatVND() ?? "0đ")").font(.caption).foregroundColor(.secondary)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
        }
        .navigationTitle("Chi tiết Công nợ")
        .navigationBarTitleDisplayMode(.inline)
    }
}
