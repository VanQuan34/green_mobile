import SwiftUI

struct ProductListView: View {
    @EnvironmentObject var dataManager: DataManager
    @State private var searchText = ""
    @State private var isShowingAddProduct = false
    @State private var selectedProductIDs = Set<String>()
    @State private var isShowingBulkInvoiceForm = false
    
    var selectedProducts: [Product] {
        dataManager.products.filter { selectedProductIDs.contains($0.id) }
    }
    
    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                // Custom Header Section
                VStack(spacing: 12) {
                    // Row 1: Action Buttons
                    HStack(spacing: 12) {
                        if !selectedProductIDs.isEmpty {
                            Button(action: { isShowingBulkInvoiceForm = true }) {
                                HStack(spacing: 4) {
                                    Image(systemName: "doc.text.badge.plus")
                                    Text("Lập đơn (\(selectedProductIDs.count))")
                                        .fontWeight(.semibold)
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(AppTheme.primary)
                                .foregroundColor(.white)
                                .cornerRadius(10)
                            }
                            .transition(.scale.combined(with: .opacity))
                            
                            Button(action: { selectedProductIDs.removeAll() }) {
                                HStack(spacing: 4) {
                                    Image(systemName: "xmark.circle.fill")
                                    Text("Hủy")
                                }
                                .foregroundColor(.red)
                                .padding(.vertical, 8)
                                .padding(.horizontal, 12)
                                .background(Color.red.opacity(0.1))
                                .cornerRadius(10)
                            }
                        }
                        
                        Spacer()
                        
                        Button(action: { isShowingAddProduct = true }) {
                            HStack {
                                Image(systemName: "plus.circle.fill")
                                Text("Thêm mới")
                                    .fontWeight(.medium)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(Color.blue.opacity(0.1))
                            .foregroundColor(.blue)
                            .cornerRadius(10)
                        }
                    }
                    
                    // Row 2: Custom Search Bar
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(.secondary)
                        
                        TextField("Tìm kiếm tên, IMEI, màu sắc...", text: $searchText)
                            .textFieldStyle(PlainTextFieldStyle())
                            .autocorrectionDisabled()
                            .textInputAutocapitalization(.never)
                        
                        if !searchText.isEmpty {
                            Button(action: { searchText = "" }) {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    .padding(10)
                    .background(Color.gray.opacity(0.1))
                    .cornerRadius(12)
                }
                .padding()
                .background(Color(UIColor.systemBackground))
                .animation(.spring(), value: selectedProductIDs.isEmpty)
                
                Divider()
                
                // List Section
                List {
                    ForEach(dataManager.products) { product in
                        HStack(spacing: 12) {
                            // Checkbox
                            Button(action: {
                                if selectedProductIDs.contains(product.id) {
                                    selectedProductIDs.remove(product.id)
                                } else {
                                    selectedProductIDs.insert(product.id)
                                }
                            }) {
                                Image(systemName: selectedProductIDs.contains(product.id) ? "checkmark.circle.fill" : "circle")
                                    .font(.system(size: 22))
                                    .foregroundColor(selectedProductIDs.contains(product.id) ? AppTheme.primary : Color.secondary.opacity(0.4))
                            }
                            .buttonStyle(PlainButtonStyle())
                            
                            // Product Info (Link to detail)
                            NavigationLink(destination: ProductDetailView(product: product)) {
                                VStack(alignment: .leading, spacing: 6) {
                                    // Row 1: Name and Price
                                    HStack(alignment: .top) {
                                        Text(product.name)
                                            .font(.system(size: 16, weight: .bold))
                                            .lineLimit(2)
                                        
                                        Spacer()
                                        
                                        if let sellingPrice = product.sellingPrice {
                                            Text(sellingPrice.formatVND())
                                                .font(.system(size: 16, weight: .black, design: .rounded))
                                                .foregroundColor(AppTheme.primary)
                                        }
                                    }
                                    
                                    // Row 2: Color/Capacity and Original Price
                                    HStack(alignment: .center) {
                                        Text("\(product.color ?? "N/A") | \(product.capacity ?? "N/A")")
                                            .font(.system(size: 11))
                                            .foregroundColor(.secondary)
                                        
                                        Spacer()
                                        
                                        if let originalPrice = product.originalPrice {
                                            Text(originalPrice.formatVND())
                                                .font(.system(size: 11))
                                                .strikethrough()
                                                .foregroundColor(.gray.opacity(0.8))
                                        }
                                    }
                                    
                                    // Row 3: IMEI and Status
                                    HStack(spacing: 8) {
                                        Text(product.imei ?? "N/A")
                                            .font(.system(size: 10, design: .monospaced))
                                            .padding(.horizontal, 6)
                                            .padding(.vertical, 2)
                                            .background(Color.gray.opacity(0.1))
                                            .cornerRadius(4)
                                        
                                        if let status = product.status {
                                            Text(status)
                                                .font(.system(size: 10, weight: .medium))
                                                .foregroundColor(AppTheme.textMuted)
                                                .padding(.horizontal, 4)
                                                .padding(.vertical, 2)
                                                .background(Color.gray.opacity(0.05))
                                                .cornerRadius(4)
                                        }
                                    }
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
                .listStyle(PlainListStyle())
            }
            .navigationTitle("Sản phẩm (\(dataManager.dashboardStats.inventoryCount))")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable {
                await dataManager.fetchProducts(page: 1, search: searchText)
            }
            .onChange(of: searchText) { newValue in
                Task {
                    await dataManager.fetchProducts(page: 1, search: newValue)
                }
            }
            .sheet(isPresented: $isShowingAddProduct) {
                AddProductFormView()
            }
            .sheet(isPresented: $isShowingBulkInvoiceForm) {
                InvoiceFormView(products: selectedProducts) {
                    selectedProductIDs.removeAll()
                }
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
    @State private var isShowingEditForm = false
    
    var body: some View {
        List {
            Section(header: Text("Thông tin cơ bản")) {
                ProductDetailRow(label: "Tên sản phẩm", value: product.name)
                ProductDetailRow(label: "IMEI", value: product.imei ?? "N/A")
                ProductDetailRow(label: "Tình trạng", value: product.status ?? "N/A")
            }
            
            Section(header: Text("Cấu hình")) {
                ProductDetailRow(label: "Màu sắc", value: product.color ?? "N/A")
                ProductDetailRow(label: "Dung lượng", value: product.capacity ?? "N/A")
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
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Sửa") {
                    isShowingEditForm = true
                }
                .fontWeight(.semibold)
            }
        }
        .sheet(isPresented: $isShowingInvoiceForm) {
            InvoiceFormView(products: [product])
        }
        .sheet(isPresented: $isShowingEditForm) {
            ProductEditView(product: product)
        }
    }
}

struct ProductEditView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    let product: Product
    let capacities = ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"]
    
    @State private var name: String = ""
    @State private var imei: String = ""
    @State private var color: String = ""
    @State private var capacity: String = ""
    @State private var status: String = ""
    @State private var originalPrice: String = ""
    @State private var sellingPrice: String = ""
    
    @State private var isSaving = false
    @State private var errorMessage: String?
    
    init(product: Product) {
        self.product = product
        _name = State(initialValue: product.name)
        _imei = State(initialValue: product.imei ?? "")
        _color = State(initialValue: product.color ?? "")
        _capacity = State(initialValue: product.capacity ?? "128GB")
        _status = State(initialValue: product.status ?? "")
        _originalPrice = State(initialValue: String(product.originalPrice ?? 0).formatCurrency())
        _sellingPrice = State(initialValue: String(product.sellingPrice ?? 0).formatCurrency())
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Thông tin cơ bản")) {
                    TextField("Tên điện thoại (ví dụ: iPhone 15 Pro Max)", text: $name)
                    TextField("IMEI", text: $imei)
                }
                
                Section(header: Text("Cấu hình")) {
                    Picker("Dung lượng", selection: $capacity) {
                        ForEach(capacities, id: \.self) { cap in
                            Text(cap).tag(cap)
                        }
                    }
                    TextField("Màu sắc (ví dụ: Titan Tự Nhiên)", text: $color)
                }
                
                Section(header: Text("Giá cả (đ)")) {
                    VStack(alignment: .trailing, spacing: 4) {
                        HStack {
                            Text("Giá gốc:")
                            Spacer()
                            TextField("0", text: $originalPrice)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                                .fontWeight(.semibold)
                                .onChange(of: originalPrice) { newValue in
                                    originalPrice = newValue.formatCurrency()
                                }
                        }
                        
                        let cleanPrice = originalPrice.replacingOccurrences(of: ".", with: "")
                        if let priceInt = Int(cleanPrice), priceInt > 0 {
                            Text(readVietnameseNumber(priceInt))
                                .font(.system(size: 10))
                                .foregroundColor(.secondary)
                                .italic()
                        }
                    }
                    
                    VStack(alignment: .trailing, spacing: 4) {
                        HStack {
                            Text("Giá bán:")
                            Spacer()
                            TextField("0", text: $sellingPrice)
                                .keyboardType(.numberPad)
                                .multilineTextAlignment(.trailing)
                                .fontWeight(.bold)
                                .foregroundColor(AppTheme.primary)
                                .onChange(of: sellingPrice) { newValue in
                                    sellingPrice = newValue.formatCurrency()
                                }
                        }
                        
                        let cleanPrice = sellingPrice.replacingOccurrences(of: ".", with: "")
                        if let priceInt = Int(cleanPrice), priceInt > 0 {
                            Text(readVietnameseNumber(priceInt))
                                .font(.system(size: 10))
                                .foregroundColor(.secondary)
                                .italic()
                        }
                    }
                    
                    let cleanOriginal = Int(originalPrice.replacingOccurrences(of: ".", with: "")) ?? 0
                    let cleanSelling = Int(sellingPrice.replacingOccurrences(of: ".", with: "")) ?? 0
                    if cleanSelling > 0 && cleanSelling < cleanOriginal {
                        Text("⚠️ Giá bán đang thấp hơn giá gốc!")
                            .font(.caption)
                            .foregroundColor(.orange)
                    }
                }
                
                Section(header: Text("Tình trạng / Ghi chú")) {
                   TextEditor(text: $status)
                       .frame(minHeight: 100)
                }
                
                if let error = errorMessage {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Sửa sản phẩm")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Hủy") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    if isSaving {
                        ProgressView()
                    } else {
                        Button("Lưu") {
                            saveProduct()
                        }
                        .fontWeight(.bold)
                        .disabled(name.isEmpty || imei.isEmpty)
                    }
                }
            }
        }
    }
    
    private func saveProduct() {
        isSaving = true
        errorMessage = nil
        
        let cleanOriginal = originalPrice.replacingOccurrences(of: ".", with: "")
        let cleanSelling = sellingPrice.replacingOccurrences(of: ".", with: "")
        
        let updated = Product(
            id: product.id,
            name: name,
            imei: imei,
            color: color,
            capacity: capacity,
            status: status,
            originalPrice: Int(cleanOriginal) ?? 0,
            sellingPrice: Int(cleanSelling) ?? 0,
            sale: product.sale ?? false
        )
        
        Task {
            do {
                try await dataManager.updateProduct(updated)
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

struct ProductDetailRow: View {
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
