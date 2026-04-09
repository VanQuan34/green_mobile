import SwiftUI

struct ProductListView: View {
    @EnvironmentObject var dataManager: DataManager
    @State private var searchText = ""
    @State private var isShowingAddProduct = false
    
    // We'll use the server-side filtered products directly from dataManager
    // but we can still have a local filter if needed for UI smoothness.
    // However, the request implies server-side pagination/search.
    
    var body: some View {
        NavigationView {
            List {
                ForEach(dataManager.products) { product in
                    NavigationLink(destination: ProductDetailView(product: product)) {
                        HStack(spacing: 15) {
                            VStack(alignment: .leading, spacing: 5) {
                                Text(product.name)
                                    .font(.headline)
                                
                                HStack {
                                    Text(product.last4Imei)
                                        .font(.caption)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.gray.opacity(0.1))
                                        .cornerRadius(4)
                                    
                                    if let status = product.status {
                                        Text(status)
                                            .font(.caption)
                                            .foregroundColor(AppTheme.textMuted)
                                    }
                                }
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .trailing, spacing: 5) {
                                if let sellingPrice = product.sellingPrice {
                                    Text(sellingPrice.formatVND())
                                        .fontWeight(.bold)
                                        .foregroundColor(AppTheme.primary)
                                }
                                
                                if let originalPrice = product.originalPrice {
                                    Text(originalPrice.formatVND())
                                        .font(.caption2)
                                        .strikethrough()
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                        .padding(.vertical, 4)
                        .onAppear {
                            // Infinite Scroll Trigger
                            if product.id == dataManager.products.last?.id {
                                Task {
                                    await dataManager.fetchNextProductsPage(search: searchText)
                                }
                            }
                        }
                    }
                }
                
                // Loading indicator at bottom
                if dataManager.isFetchingMoreProducts {
                    HStack {
                        Spacer()
                        ProgressView()
                            .padding()
                        Spacer()
                    }
                }
            }
            .searchable(text: $searchText, prompt: "Tìm kiếm sản phẩm")
            .onChange(of: searchText) { newValue in
                // Debounce search or just search on commit
                // For now, let's keep it simple and refresh on change (may need debounce later)
                Task {
                    await dataManager.fetchProducts(page: 1, search: newValue)
                }
            }
            .navigationTitle("Sản phẩm")
            .refreshable {
                await dataManager.fetchProducts(page: 1, search: searchText)
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { isShowingAddProduct = true }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $isShowingAddProduct) {
                AddProductFormView()
            }
            .overlay {
                if dataManager.isLoading && dataManager.products.isEmpty {
                    ProgressView("Đang tải dữ liệu...")
                }
            }
        }
    }
}

struct ProductDetailView: View {
    let product: Product
    @State private var isShowingInvoiceForm = false
    
    var body: some View {
        List {
            Section(header: Text("Thông tin cơ bản")) {
                DetailRow(label: "Tên sản phẩm", value: product.name)
                DetailRow(label: "IMEI", value: product.imei ?? "N/A")
                DetailRow(label: "Tình trạng", value: product.status ?? "N/A")
            }
            
            Section(header: Text("Cấu hình")) {
                DetailRow(label: "Màu sắc", value: product.color ?? "N/A")
                DetailRow(label: "Dung lượng", value: product.capacity ?? "N/A")
            }
            
            Section(header: Text("Giá cả")) {
                HStack {
                    Text("Giá gốc")
                    Spacer()
                    Text(product.originalPrice?.formatVND() ?? "N/A")
                        .foregroundColor(.secondary)
                }
                HStack {
                    Text("Giá bán")
                        .fontWeight(.bold)
                    Spacer()
                    Text(product.sellingPrice?.formatVND() ?? "N/A")
                        .fontWeight(.bold)
                        .foregroundColor(AppTheme.primary)
                }
            }
            
            Section {
                Button(action: { isShowingInvoiceForm = true }) {
                    HStack {
                        Spacer()
                        Label("Lập hóa đơn ngay", systemImage: "plus.circle.fill")
                            .font(.headline)
                            .foregroundColor(.white)
                        Spacer()
                    }
                    .padding(.vertical, 10)
                }
                .listRowBackground(AppTheme.primary)
            }
        }
        .navigationTitle("Chi tiết sản phẩm")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $isShowingInvoiceForm) {
            InvoiceFormView(products: [product])
        }
    }
}

struct DetailRow: View {
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

#Preview {
    ProductListView().environmentObject(DataManager.shared)
}
