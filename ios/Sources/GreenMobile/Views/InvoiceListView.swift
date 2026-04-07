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
    
    // Helper to get counts for tabs
    private var counts: [InvoiceFilter: Int] {
        var counts: [InvoiceFilter: Int] = [:]
        counts[.all] = dataManager.invoices.count
        counts[.paid] = dataManager.invoices.filter { $0.isFullyPaid == true }.count
        counts[.debt] = dataManager.invoices.filter { $0.isFullyPaid != true }.count
        return counts
    }
    
    var filteredInvoices: [Invoice] {
        var result = dataManager.invoices
        
        // Tab Filtering
        switch selectedFilter {
        case .all:
            break
        case .paid:
            result = result.filter { $0.isFullyPaid == true }
        case .debt:
            result = result.filter { $0.isFullyPaid != true }
        }
        
        // Search Filtering
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
                // Tab Picker with Counts
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
                                
                                // Payment Status Badge
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
                Text("Form lập hóa đơn mới")
            }
        }
    }
}

struct InvoiceDetailView: View {
    let invoice: Invoice
    
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
                        VStack(alignment: .leading) {
                            Text(product.name)
                            Text(product.last4Imei)
                                .font(.caption2)
                                .foregroundColor(.secondary)
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
    }
}

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

#Preview {
    InvoiceListView().environmentObject(DataManager.shared)
}
