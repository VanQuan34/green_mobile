import SwiftUI

struct InvoiceFormView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    // Inputs
    let products: [Product]
    @State private var buyerName: String = ""
    @State private var buyerPhone: String = ""
    @State private var buyerAddress: String = ""
    @State private var amountPaid: String = ""
    
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var showSuggestions = false
    
    var totalAmount: Int {
        products.reduce(0) { $0 + ($1.sellingPrice ?? 0) }
    }
    
    var debtAmount: Int {
        let paid = Int(amountPaid) ?? 0
        return max(0, totalAmount - paid)
    }
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Thông tin khách hàng")) {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack {
                            Image(systemName: "person")
                                .foregroundColor(.secondary)
                            TextField("Họ và tên khách hàng", text: $buyerName)
                                .onChange(of: buyerName) { _ in
                                    showSuggestions = true
                                }
                        }
                        
                        if showSuggestions && !buyerName.isEmpty {
                            let suggestions = dataManager.customers.filter {
                                $0.name.localizedCaseInsensitiveContains(buyerName) ||
                                $0.phone.contains(buyerName)
                            }.prefix(5)
                            
                            if !suggestions.isEmpty {
                                ScrollView {
                                    VStack(alignment: .leading, spacing: 0) {
                                        ForEach(suggestions) { customer in
                                            Button(action: {
                                                buyerName = customer.name
                                                buyerPhone = customer.phone
                                                buyerAddress = customer.address
                                                showSuggestions = false
                                            }) {
                                                HStack {
                                                    VStack(alignment: .leading, spacing: 2) {
                                                        Text(customer.name)
                                                            .font(.subheadline)
                                                            .fontWeight(.semibold)
                                                            .foregroundColor(.primary)
                                                        Text(customer.phone)
                                                            .font(.caption)
                                                            .foregroundColor(.secondary)
                                                    }
                                                    Spacer()
                                                    Image(systemName: "plus.circle")
                                                        .foregroundColor(AppTheme.primary)
                                                }
                                                .padding(.vertical, 8)
                                                .padding(.horizontal, 10)
                                                .background(Color.white)
                                            }
                                            Divider()
                                        }
                                    }
                                }
                                .frame(maxHeight: 180)
                                .background(Color.white)
                                .cornerRadius(8)
                                .shadow(color: Color.black.opacity(0.1), radius: 4, x: 0, y: 2)
                                .padding(.top, 5)
                            }
                        }
                    }
                    
                    HStack {
                        Image(systemName: "phone")
                            .foregroundColor(.secondary)
                        TextField("Số điện thoại", text: $buyerPhone)
                            .keyboardType(.phonePad)
                            .onChange(of: buyerPhone) { _ in showSuggestions = false }
                    }
                    HStack {
                        Image(systemName: "mappin.and.ellipse")
                            .foregroundColor(.secondary)
                        TextField("Địa chỉ (không bắt buộc)", text: $buyerAddress)
                            .onChange(of: buyerAddress) { _ in showSuggestions = false }
                    }
                }
                
                Section(header: Text("Sản phẩm đã chọn")) {
                    ForEach(products) { product in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(product.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                Text(product.last4Imei)
                                    .font(.system(size: 10, design: .monospaced))
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Text(product.sellingPrice?.formatVND() ?? "0đ")
                                .font(.subheadline)
                                .foregroundColor(AppTheme.primary)
                                .fontWeight(.bold)
                        }
                    }
                }
                
                Section(header: Text("Thanh toán")) {
                    HStack {
                        Text("Tổng giá trị:")
                        Spacer()
                        Text(totalAmount.formatVND())
                            .fontWeight(.bold)
                    }
                    
                    HStack {
                        Text("Khách đã trả:")
                        Spacer()
                        TextField("0", text: $amountPaid)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                            .fontWeight(.semibold)
                            .foregroundColor(AppTheme.success)
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
                        Text(error)
                            .foregroundColor(AppTheme.danger)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Lập hóa đơn mới")
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
                        Button("Hoàn tất") {
                            saveInvoice()
                        }
                        .disabled(buyerName.isEmpty || buyerPhone.isEmpty)
                        .fontWeight(.bold)
                    }
                }
            }
            .onAppear {
                // Initialize amountPaid with totalAmount by default
                if amountPaid.isEmpty {
                    amountPaid = String(totalAmount)
                }
            }
        }
    }
    
    private func saveInvoice() {
        guard !buyerName.isEmpty && !buyerPhone.isEmpty else { return }
        
        isSaving = true
        errorMessage = nil
        
        let paidInt = Int(amountPaid) ?? 0
        let newInvoice = Invoice(
            buyerName: buyerName,
            buyerPhone: buyerPhone,
            buyerAddress: buyerAddress,
            totalAmount: totalAmount,
            amountPaid: paidInt,
            products: products
        )
        
        Task {
            do {
                try await dataManager.addInvoice(newInvoice)
                await MainActor.run {
                    isSaving = false
                    dismiss()
                }
            } catch {
                await MainActor.run {
                    isSaving = false
                    errorMessage = "Lỗi khi lưu hóa đơn: \(error.localizedDescription)"
                }
            }
        }
    }
}

#Preview {
    InvoiceFormView(products: [
        Product(name: "iPhone 15 Pro", imei: "1234567890", color: "Titan Xanh", capacity: "256GB", status: "Mới 100%", originalPrice: 25000000, sellingPrice: 28000000)
    ]).environmentObject(DataManager.shared)
}
