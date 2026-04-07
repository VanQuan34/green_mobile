import SwiftUI

struct AddProductFormView: View {
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var dataManager: DataManager
    
    @State private var name: String = ""
    @State private var imei: String = ""
    @State private var color: String = ""
    @State private var capacity: String = "128GB"
    @State private var status: String = ""
    @State private var originalPrice: String = ""
    @State private var sellingPrice: String = ""
    @State private var isLoading: Bool = false
    @State private var errorMessage: String? = nil
    
    let capacities = ["16GB", "32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"]
    
    var isFormValid: Bool {
        !name.isEmpty && !imei.isEmpty && !color.isEmpty && !originalPrice.isEmpty && !sellingPrice.isEmpty
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
                    HStack {
                        Text("Giá gốc:")
                        TextField("0", text: $originalPrice)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                    }
                    HStack {
                        Text("Giá bán:")
                        TextField("0", text: $sellingPrice)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.trailing)
                    }
                    
                    if let oPrice = Int(originalPrice), let sPrice = Int(sellingPrice), sPrice < oPrice {
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
            .navigationTitle("Thêm sản phẩm")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Hủy") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: saveProduct) {
                        if isLoading {
                            ProgressView()
                        } else {
                            Text("Lưu")
                                .fontWeight(.bold)
                        }
                    }
                    .disabled(!isFormValid || isLoading)
                }
            }
        }
    }
    
    func saveProduct() {
        guard let oPrice = Int(originalPrice), let sPrice = Int(sellingPrice) else {
            errorMessage = "Vui lòng nhập giá trị số hợp lệ."
            return
        }
        
        let newProduct = Product(
            name: name,
            imei: imei,
            color: color,
            capacity: capacity,
            status: status,
            originalPrice: oPrice,
            sellingPrice: sPrice
        )
        
        isLoading = true
        errorMessage = nil
        
        Task {
            do {
                try await dataManager.addProduct(newProduct)
                dismiss()
            } catch {
                errorMessage = "Không thể lưu sản phẩm. Vui lòng thử lại."
                isLoading = false
            }
        }
    }
}

#Preview {
    AddProductFormView()
        .environmentObject(DataManager.shared)
}
