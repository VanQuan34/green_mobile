import Foundation
import Combine

struct DashboardStats: Codable {
    var totalRevenue: Int = 0
    var totalPaid: Int = 0
    var totalProfit: Int = 0
    var totalDebt: Int = 0
    var soldCount: Int = 0
    var inventoryCount: Int = 0
    var totalCapital: Int = 0
    var totalExpectedRevenue: Int = 0
    var last7DaysRevenue: [Date: Int] = [:]
    
    enum CodingKeys: String, CodingKey {
        case totalRevenue, totalPaid, totalDebt, soldCount, inventoryCount, totalCapital, totalExpectedRevenue
    }
}

class DataManager: ObservableObject {
    static let shared = DataManager()
    
    @Published var products: [Product] = []
    @Published var invoices: [Invoice] = []
    @Published var customers: [Customer] = []
    @Published var isLoading: Bool = false
    @Published var isFetchingMoreProducts: Bool = false
    @Published var canLoadMoreProducts: Bool = true
    @Published var dashboardStats = DashboardStats()
    
    private var productsPage: Int = 1
    private let productsPerPage = 15
    private var cancellables = Set<AnyCancellable>()
    
    private init() {}
    
    func fetchInitialData() async {
        DispatchQueue.main.async { self.isLoading = true }
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.fetchInvoices() }
            group.addTask { await self.fetchCustomers() }
            group.addTask { await self.fetchProducts(page: 1) }
            group.addTask { await self.fetchDashboardStats() }
        }
        calculateDashboardStats()
    }
    
    func fetchNextProductsPage(search: String? = nil) async {
        guard canLoadMoreProducts && !isFetchingMoreProducts else { return }
        await fetchProducts(page: productsPage + 1, search: search)
    }
    
    func fetchProducts(page: Int = 1, search: String? = nil) async {
        if page == 1 {
            productsPage = 1
            canLoadMoreProducts = true
        }
        
        guard canLoadMoreProducts else { return }
        
        if page > 1 {
            DispatchQueue.main.async { self.isFetchingMoreProducts = true }
        } else if products.isEmpty {
            DispatchQueue.main.async { self.isLoading = true }
        }
        
        let urlString = "\(AppConfig.apiUrl)/products?page=\(page)&per_page=\(productsPerPage)\(search != nil && !search!.isEmpty ? "&search=\(search!.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")" : "")"
        
        guard let url = URL(string: urlString) else {
            DispatchQueue.main.async {
                self.isLoading = false
                self.isFetchingMoreProducts = false
            }
            return
        }
        
        await performFetch(url: url) { (data: [Product]) in
            DispatchQueue.main.async {
                if page == 1 {
                    self.products = data
                } else {
                    self.products.append(contentsOf: data)
                }
                
                self.productsPage = page
                self.canLoadMoreProducts = data.count == self.productsPerPage
                self.isLoading = false
                self.isFetchingMoreProducts = false
                self.calculateDashboardStats()
            }
        }
    }
    
    func fetchInvoices() async {
        guard let url = URL(string: "\(AppConfig.apiUrl)/invoices") else { return }
        await performFetch(url: url) { (data: [Invoice]) in
            DispatchQueue.main.async { 
                self.invoices = data
                self.calculateDashboardStats()
            }
        }
    }
    
    func fetchCustomers() async {
        guard let url = URL(string: "\(AppConfig.apiUrl)/customers") else { return }
        await performFetch(url: url) { (data: [Customer]) in
            DispatchQueue.main.async { self.customers = data }
        }
    }
    
    func fetchDashboardStats() async {
        guard let url = URL(string: "\(AppConfig.apiUrl)/dashboard/stats") else { return }
        await performFetch(url: url) { (data: DashboardStats) in
            DispatchQueue.main.async {
                // Update specific stats from API
                self.dashboardStats.soldCount = data.soldCount
                self.dashboardStats.inventoryCount = data.inventoryCount
                self.dashboardStats.totalRevenue = data.totalRevenue
                self.dashboardStats.totalPaid = data.totalPaid
                self.dashboardStats.totalDebt = data.totalDebt
                self.dashboardStats.totalCapital = data.totalCapital
                self.dashboardStats.totalExpectedRevenue = data.totalExpectedRevenue
                
                self.calculateDashboardStats()
            }
        }
    }
    
    func updateCustomer(_ customer: Customer) async throws {
        guard let url = URL(string: "\(AppConfig.apiUrl)/customers/\(customer.p_id)") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = UserDefaults.standard.string(forKey: "token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        request.httpBody = try JSONEncoder().encode(customer)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            if httpResponse.statusCode == 200 {
                // Keep old phone for matching before refresh
                let oldPhone = customers.first { $0.p_id == customer.p_id }?.phone ?? ""
                
                await fetchCustomers() // Refresh list
                
                // Update local invoices to reflect changes immediately
                DispatchQueue.main.async {
                    for i in 0..<self.invoices.count {
                        if self.invoices[i].buyerPhone == oldPhone || self.invoices[i].buyerPhone == customer.phone {
                            self.invoices[i].buyerName = customer.name
                            self.invoices[i].buyerPhone = customer.phone
                            self.invoices[i].buyerAddress = customer.address
                        }
                    }
                }
            } else {
                if let errorJson = String(data: data, encoding: .utf8) {
                    print("DataManager Error: Update Customer failed (\(httpResponse.statusCode)): \(errorJson)")
                }
                throw AppError.loginFailed(message: "Không thể cập nhật khách hàng. Mã lỗi \(httpResponse.statusCode).")
            }
        }
    }
    
    func calculateDashboardStats() {
        var stats = DashboardStats()
        
        // 1. Basic Counts
        stats.totalRevenue = invoices.reduce(0) { $0 + $1.totalAmount }
        stats.totalPaid = invoices.reduce(0) { $0 + ($1.amountPaid ?? 0) }
        stats.totalDebt = invoices.reduce(0) { $0 + ($1.debt ?? 0) }
        
        stats.soldCount = invoices.reduce(0) { $0 + ($1.products?.count ?? 1) }
        let unsoldProducts = products.filter { !($0.sale ?? false) }
        stats.inventoryCount = unsoldProducts.count
        
        // 2. Capital & Profit
        let unsoldCapital = unsoldProducts.reduce(0) { $0 + ($1.originalPrice ?? 0) }
        let soldCapital = invoices.reduce(0) { sum, inv in
            if let products = inv.products, !products.isEmpty {
                return sum + products.reduce(0) { $0 + ($1.originalPrice ?? 0) }
            } else {
                return sum // Standard approach for multi-product
            }
        }
        stats.totalInventoryValue = unsoldCapital + soldCapital
        
        let currentUnsoldRevenue = unsoldProducts.reduce(0) { $0 + ($1.sellingPrice ?? 0) }
        stats.expectedTotalRevenue = stats.totalRevenue + currentUnsoldRevenue
        
        stats.totalProfit = invoices.reduce(0) { sum, inv in
            let revenue = inv.totalAmount
            let cost = inv.products?.reduce(0) { $0 + ($1.originalPrice ?? 0) } ?? 0
            return sum + (revenue - cost)
        }
        
        // 3. Time-series (Last 7 Days)
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        var sevenDayData: [Date: Int] = [:]
        
        for i in 0..<7 {
            if let date = calendar.date(byAdding: .day, value: -i, to: today) {
                sevenDayData[date] = 0
            }
        }
        
        for invoice in invoices {
            let invDate = calendar.startOfDay(for: invoice.dateObject)
            if sevenDayData[invDate] != nil {
                sevenDayData[invDate]! += invoice.totalAmount
            }
        }
        stats.last7DaysRevenue = sevenDayData
        
        DispatchQueue.main.async {
            self.dashboardStats = stats
        }
    }
    
    func addProduct(_ product: Product) async throws {
        guard let url = URL(string: "\(AppConfig.apiUrl)/products") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = UserDefaults.standard.string(forKey: "token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // We use the product itself since it matches the API structure
        request.httpBody = try JSONEncoder().encode(product)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            if httpResponse.statusCode == 200 || httpResponse.statusCode == 201 {
                await fetchProducts(page: 1) // Refresh list
            } else {
                if let errorJson = String(data: data, encoding: .utf8) {
                    print("DataManager Error: Add Product failed (\(httpResponse.statusCode)): \(errorJson)")
                }
                throw AppError.loginFailed(message: "Không thể lưu sản phẩm. Máy chủ trả về lỗi \(httpResponse.statusCode).")
            }
        }
    }
    
    func addInvoice(_ invoice: Invoice) async throws {
        guard let url = URL(string: "\(AppConfig.apiUrl)/invoices") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = UserDefaults.standard.string(forKey: "token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        request.httpBody = try JSONEncoder().encode(invoice)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            if httpResponse.statusCode == 200 {
                await fetchInvoices() // Refresh
                await fetchDashboardStats() // Refresh Dashboard data
            } else {
                if let errorJson = String(data: data, encoding: .utf8) {
                    print("DataManager Error: Add Invoice failed (\(httpResponse.statusCode)): \(errorJson)")
                }
                throw AppError.loginFailed(message: "Không thể lưu hóa đơn. Máy chủ trả về lỗi \(httpResponse.statusCode).")
            }
        }
    }
    
    private func performFetch<T: Codable>(url: URL, completion: @escaping (T) -> Void) async {
        do {
            var request = URLRequest(url: url)
            if let token = UserDefaults.standard.string(forKey: "token") {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else { return }
            
            if httpResponse.statusCode != 200 { return }
            
            let decoder = JSONDecoder()
            do {
                let decodedData = try decoder.decode(T.self, from: data)
                completion(decodedData)
            } catch {
                print("DataManager Decoding Error: \(error)")
            }
        } catch {
            print("DataManager Network Error: \(error)")
        }
    }
}
