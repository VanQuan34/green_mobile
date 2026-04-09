import SwiftUI

struct CustomerListView: View {
    @EnvironmentObject var dataManager: DataManager
    @State private var searchQuery = ""
    @State private var editingCustomer: Customer?
    @State private var isShowingEditSheet = false
    
    var filteredCustomers: [Customer] {
        if searchQuery.isEmpty {
            return dataManager.customers
        } else {
            return dataManager.customers.filter {
                $0.name.localizedCaseInsensitiveContains(searchQuery) ||
                $0.phone.contains(searchQuery)
            }
        }
    }
    
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
                
                if dataManager.isLoading && dataManager.customers.isEmpty {
                    Spacer()
                    ProgressView("Đang tải dữ liệu...")
                    Spacer()
                } else {
                    List {
                        ForEach(filteredCustomers) { customer in
                            CustomerRow(customer: customer) {
                                editingCustomer = customer
                                isShowingEditSheet = true
                            }
                        }
                    }
                    .listStyle(InsetGroupedListStyle())
                    .refreshable {
                        await dataManager.fetchCustomers()
                    }
                }
            }
            .navigationTitle("Khách hàng")
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
