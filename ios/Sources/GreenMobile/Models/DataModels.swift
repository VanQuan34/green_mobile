import Foundation

struct Product: Codable, Identifiable {
    let id: String
    let name: String
    let imei: String?
    let color: String?
    let capacity: String?
    let status: String?
    let originalPrice: Int?
    let sellingPrice: Int?
    let sale: Bool?
    
    // Formatting helper
    var last4Imei: String {
        guard let imei = imei, imei.count >= 4 else { return imei ?? "N/A" }
        return "..." + imei.suffix(4)
    }
    
    enum CodingKeys: String, CodingKey {
        case id, name, imei, color, capacity, status, originalPrice, sellingPrice, sale
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Flexible ID decoding
        if let idInt = try? container.decode(Int.self, forKey: .id) {
            self.id = String(idInt)
        } else if let idStr = try? container.decode(String.self, forKey: .id) {
            self.id = idStr
        } else {
            self.id = UUID().uuidString
        }
        
        self.name = (try? container.decode(String.self, forKey: .name)) ?? "Unknown"
        self.imei = try? container.decode(String.self, forKey: .imei)
        self.color = try? container.decode(String.self, forKey: .color)
        self.capacity = try? container.decode(String.self, forKey: .capacity)
        self.status = try? container.decode(String.self, forKey: .status)
        self.originalPrice = try? container.decode(Int.self, forKey: .originalPrice)
        self.sellingPrice = try? container.decode(Int.self, forKey: .sellingPrice)
        self.sale = try? container.decode(Bool.self, forKey: .sale)
    }
    
    // Custom init for creating new products
    init(name: String, imei: String, color: String, capacity: String, status: String, originalPrice: Int, sellingPrice: Int) {
        self.id = "" // Server will generate this
        self.name = name
        self.imei = imei
        self.color = color
        self.capacity = capacity
        self.status = status
        self.originalPrice = originalPrice
        self.sellingPrice = sellingPrice
        self.sale = false
    }
}

extension Int {
    func formatVND() -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = "."
        return (formatter.string(from: NSNumber(value: self)) ?? "\(self)") + "đ"
    }
}

struct Invoice: Codable, Identifiable {
    let id: String
    let buyerName: String
    let buyerPhone: String
    let buyerAddress: String
    let totalAmount: Int
    let amountPaid: Int?
    let debt: Int?
    let isFullyPaid: Bool?
    let products: [Product]?
    let date: String
    let createdAt: String?
    
    var dateObject: Date {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        if let created = createdAt, let dateOb = formatter.date(from: created) {
            return dateOb
        }
        return formatter.date(from: date) ?? Date()
    }
    
    var formattedDate: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "dd/MM/yyyy HH:mm"
        return formatter.string(from: dateObject)
    }
    
    enum CodingKeys: String, CodingKey {
        case id, buyerName, buyerPhone, buyerAddress, totalAmount, amountPaid, debt, isFullyPaid, products, date, createdAt
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        if let idInt = try? container.decode(Int.self, forKey: .id) {
            self.id = String(idInt)
        } else if let idStr = try? container.decode(String.self, forKey: .id) {
            self.id = idStr
        } else {
            self.id = UUID().uuidString
        }
        
        self.buyerName = (try? container.decode(String.self, forKey: .buyerName)) ?? "No Name"
        self.buyerPhone = (try? container.decode(String.self, forKey: .buyerPhone)) ?? ""
        self.buyerAddress = (try? container.decode(String.self, forKey: .buyerAddress)) ?? ""
        self.totalAmount = (try? container.decode(Int.self, forKey: .totalAmount)) ?? 0
        self.amountPaid = try? container.decode(Int.self, forKey: .amountPaid)
        self.debt = try? container.decode(Int.self, forKey: .debt)
        self.isFullyPaid = try? container.decode(Bool.self, forKey: .isFullyPaid)
        self.products = try? container.decode([Product].self, forKey: .products)
        self.date = (try? container.decode(String.self, forKey: .date)) ?? ""
        self.createdAt = try? container.decode(String.self, forKey: .createdAt)
    }
    
    // Custom init for creating new invoices
    init(buyerName: String, buyerPhone: String, buyerAddress: String, totalAmount: Int, amountPaid: Int, products: [Product]) {
        self.id = "" // Server will generate this
        self.buyerName = buyerName
        self.buyerPhone = buyerPhone
        self.buyerAddress = buyerAddress
        self.totalAmount = totalAmount
        self.amountPaid = amountPaid
        self.debt = totalAmount - amountPaid
        self.isFullyPaid = amountPaid >= totalAmount
        self.products = products
        
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd HH:mm:ss"
        self.date = formatter.string(from: Date())
        self.createdAt = self.date
    }
}

struct Customer: Codable, Identifiable {
    var id: String { phone }
    let name: String
    let phone: String
    let address: String
}
