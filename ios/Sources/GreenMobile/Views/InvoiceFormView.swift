import SwiftUI

struct InvoiceFormView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    // Inputs
    let products: [Product]
    var onSuccess: (() -> Void)? = nil
    
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
                            VStack(alignment: .leading, spacing: 2) {
                                Text(product.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                
                                Text("\(product.color ?? "N/A") | \(product.capacity ?? "N/A")")
                                    .font(.system(size: 10))
                                    .foregroundColor(.secondary)
                                
                                Text(product.imei ?? "N/A")
                                    .font(.system(size: 10, design: .monospaced))
                                    .padding(.horizontal, 4)
                                    .padding(.vertical, 1)
                                    .background(Color.gray.opacity(0.1))
                                    .cornerRadius(2)
                            }
                            Spacer()
                            Text(product.sellingPrice?.formatVND() ?? "0đ")
                                .font(.subheadline)
                                .foregroundColor(AppTheme.primary)
                                .fontWeight(.bold)
                        }
                        .padding(.vertical, 2)
                    }
                }
                
                Section(header: Text("Thanh toán")) {
                    HStack {
                        Text("Tổng giá trị:")
                        Spacer()
                        Text(totalAmount.formatVND())
                            .fontWeight(.bold)
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
                    .padding(.vertical, 4)
                    
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
                        .disabled(buyerName.isEmpty || buyerPhone.isEmpty || !isAmountPaidValid)
                        .fontWeight(.bold)
                    }
                }
            }
            .onAppear {
                // Initialize amountPaid with totalAmount by default
                if amountPaid.isEmpty {
                    amountPaid = String(totalAmount).formatCurrency()
                }
            }
        }
    }
    
    private func saveInvoice() {
        guard !buyerName.isEmpty && !buyerPhone.isEmpty else { return }
        
        isSaving = true
        errorMessage = nil
        
        // Remove formatting (dots) before saving
        let cleanPaid = amountPaid.replacingOccurrences(of: ".", with: "")
        let paidInt = Int(cleanPaid) ?? 0
        
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
                    onSuccess?()
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

// MARK: - Vietnamese Currency Utilities
extension String {
    func formatCurrency() -> String {
        let clean = self.replacingOccurrences(of: ".", with: "").replacingOccurrences(of: " ", with: "")
        guard let number = Int(clean) else { return "" }
        let formatter = NumberFormatter()
        formatter.groupingSeparator = "."
        formatter.numberStyle = .decimal
        return formatter.string(from: NSNumber(value: number)) ?? ""
    }
}

func readVietnameseNumber(_ number: Int) -> String {
    if number == 0 { return "Không đồng" }
    
    let units = ["", "mươi", "trăm", "nghìn", "mươi", "trăm", "triệu", "mươi", "trăm", "tỷ"]
    let digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"]
    
    func readThreeDigits(_ n: Int, isFirst: Bool = false) -> String {
        let h = n / 100
        let t = (n % 100) / 10
        let u = n % 10
        var res = ""
        
        if h > 0 || !isFirst {
            res += digits[h] + " trăm "
        }
        
        if t > 0 {
            if t == 1 { res += "mười " }
            else { res += digits[t] + " mươi " }
        } else if h > 0 && u > 0 {
            res += "lẻ "
        }
        
        if u > 0 {
            if u == 1 && t > 1 { res += "mốt " }
            else if u == 5 && t > 0 { res += "lăm " }
            else { res += digits[u] + " " }
        }
        
        return res
    }
    
    var n = number
    var groups: [Int] = []
    while n > 0 {
        groups.append(n % 1000)
        n /= 1000
    }
    
    let suffixes = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"]
    var res = ""
    
    for i in (0..<groups.count).reversed() {
        let gRes = readThreeDigits(groups[i], isFirst: i == groups.count - 1)
        if !gRes.isEmpty {
            res += gRes + suffixes[i] + " "
        }
    }
    
    var finalResult = res.trimmingCharacters(in: .whitespaces).capitalized
    if !finalResult.isEmpty {
        finalResult += " đồng"
    }
    return finalResult
}

#Preview {
    InvoiceFormView(products: [
        Product(name: "iPhone 15 Pro", imei: "1234567890", color: "Titan Xanh", capacity: "256GB", status: "Mới 100%", originalPrice: 25000000, sellingPrice: 28000000)
    ]).environmentObject(DataManager.shared)
}
