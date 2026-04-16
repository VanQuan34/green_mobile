import SwiftUI

struct CustomerListView: View {
    @EnvironmentObject var dataManager: DataManager
    @State private var searchQuery = ""
    @State private var editingCustomer: Customer?
    @State private var isShowingEditSheet = false
    @State private var searchTask: Task<Void, Never>?
    @State private var hasLoadedOnce = false
    
    var body: some View {
        NavigationView {
            VStack {
                // Search Bar
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundColor(.gray)
                    TextField("Tìm tên hoặc số điện thoại...", text: $searchQuery)
                        .textFieldStyle(PlainTextFieldStyle())
                }
                .padding(10)
                .background(Color(.systemGray6))
                .cornerRadius(10)
                .padding(.horizontal)
                
                // Total count badge
                HStack {
                    Spacer()
                    Text("Tổng cộng: \(dataManager.customersTotalCount) khách hàng")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .padding(.horizontal)
                        .padding(.vertical, 4)
                }
                
                if dataManager.isLoading && dataManager.customers.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("Đang tải dữ liệu...")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                } else {
                    List {
                        ForEach(dataManager.customers) { customer in
                            CustomerRow(customer: customer) {
                                editingCustomer = customer
                                isShowingEditSheet = true
                            }
                            .onAppear {
                                // Infinite scroll: load more when last item appears
                                if customer.id == dataManager.customers.last?.id {
                                    Task {
                                        await dataManager.fetchNextCustomersPage(
                                            search: searchQuery.isEmpty ? nil : searchQuery
                                        )
                                    }
                                }
                            }
                        }
                        
                        // Loading more indicator
                        if dataManager.isFetchingMoreCustomers {
                            HStack {
                                Spacer()
                                ProgressView("Đang tải thêm...")
                                    .font(.caption)
                                Spacer()
                            }
                            .listRowSeparator(.hidden)
                            .padding(.vertical, 8)
                        }
                        
                        // End of list
                        if !dataManager.canLoadMoreCustomers && !dataManager.customers.isEmpty {
                            HStack {
                                Spacer()
                                Text("Đã hiển thị tất cả \(dataManager.customers.count) khách hàng")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                                Spacer()
                            }
                            .listRowSeparator(.hidden)
                            .padding(.vertical, 4)
                        }
                    }
                    .listStyle(InsetGroupedListStyle())
                    .overlay {
                        if dataManager.isRefreshingCustomers {
                            ZStack {
                                Color(.systemBackground).opacity(0.6)
                                VStack(spacing: 10) {
                                    ProgressView()
                                        .scaleEffect(1.1)
                                    Text("Đang cập nhật...")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                .padding()
                                .background(.ultraThinMaterial)
                                .cornerRadius(12)
                            }
                        }
                    }
                    .refreshable {
                        await dataManager.fetchCustomersPaginated(
                            page: 1,
                            search: searchQuery.isEmpty ? nil : searchQuery
                        )
                    }
                }
            }
            .navigationTitle("Khách hàng")
            .task {
                // Lazy load: chỉ fetch khi lần đầu vào tab
                if !hasLoadedOnce {
                    hasLoadedOnce = true
                    await dataManager.fetchCustomersPaginated(page: 1)
                }
            }
            .onChange(of: searchQuery) { newValue in
                // Debounce search
                searchTask?.cancel()
                searchTask = Task {
                    try? await Task.sleep(nanoseconds: 1_000_000_000)
                    if !Task.isCancelled {
                        await dataManager.fetchCustomersPaginated(
                            page: 1,
                            search: newValue.isEmpty ? nil : newValue
                        )
                    }
                }
            }
            .sheet(item: $editingCustomer) { customer in
                CustomerEditView(customer: customer)
            }
        }
    }
}

struct CustomerRow: View {
    let customer: Customer
    let onEdit: () -> Void
    
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(customer.name)
                    .font(.headline)
                
                HStack {
                    Image(systemName: "phone.fill")
                        .font(.caption)
                    Text(customer.phone)
                        .font(.subheadline)
                }
                .foregroundColor(.secondary)
                
                HStack {
                    Image(systemName: "mappin.and.ellipse")
                        .font(.caption)
                    Text(customer.address)
                        .font(.caption)
                        .lineLimit(1)
                }
                .foregroundColor(.secondary)
            }
            
            Spacer()
            
            Button(action: onEdit) {
                Image(systemName: "pencil.circle.fill")
                    .font(.title2)
                    .foregroundColor(.green)
            }
            .buttonStyle(PlainButtonStyle())
        }
        .padding(.vertical, 4)
    }
}

struct CustomerEditView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    @State private var name: String
    @State private var phone: String
    @State private var address: String
    @State private var isSaving = false
    
    let customer: Customer
    
    init(customer: Customer) {
        self.customer = customer
        _name = State(initialValue: customer.name)
        _phone = State(initialValue: customer.phone)
        _address = State(initialValue: customer.address)
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Thông tin khách hàng")) {
                    TextField("Tên khách hàng", text: $name)
                    TextField("Số điện thoại", text: $phone)
                        .keyboardType(.phonePad)
                    
                    VStack(alignment: .leading) {
                        Text("Địa chỉ")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        TextEditor(text: $address)
                            .frame(minHeight: 100)
                    }
                }
            }
            .navigationTitle("Sửa thông tin")
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
                            saveChanges()
                        }
                        .bold()
                        .disabled(name.isEmpty || phone.isEmpty)
                    }
                }
            }
        }
    }
    
    private func saveChanges() {
        isSaving = true
        let updated = Customer(p_id: customer.p_id, name: name, phone: phone, address: address)
        
        Task {
            do {
                try await dataManager.updateCustomer(updated)
                isSaving = false
                dismiss()
            } catch {
                isSaving = false
                print("Error updating customer: \(error)")
                // In a real app, show an alert
            }
        }
    }
}

#Preview {
    CustomerListView()
        .environmentObject(DataManager.shared)
}
