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
    var expectedTotalRevenue: Int = 0
    var last7DaysRevenue: [Date: Int] = [:]
    
    enum CodingKeys: String, CodingKey {
        case totalRevenue, totalPaid, totalDebt, soldCount, inventoryCount, totalCapital
        case expectedTotalRevenue = "totalExpectedRevenue"
    }
}

@MainActor
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
        self.isLoading = true
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
            self.isFetchingMoreProducts = true
        } else if products.isEmpty {
            self.isLoading = true
        }
        
        let urlString = "\(AppConfig.apiUrl)/products?page=\(page)&per_page=\(productsPerPage)\(search != nil && !search!.isEmpty ? "&search=\(search!.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "")" : "")"
        
        guard let url = URL(string: urlString) else {
            self.isLoading = false
            self.isFetchingMoreProducts = false
            return
        }
        
        await performFetch(url: url) { (data: [Product]) in
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
    
    func fetchInvoices() async {
        guard let url = URL(string: "\(AppConfig.apiUrl)/invoices") else { return }
        await performFetch(url: url) { (data: [Invoice]) in
            self.invoices = data
            self.calculateDashboardStats()
        }
    }
    
    func fetchCustomers() async {
        guard let url = URL(string: "\(AppConfig.apiUrl)/customers") else { return }
        await performFetch(url: url) { (data: [Customer]) in
            self.customers = data
        }
    }
    
    func fetchDashboardStats() async {
        guard let url = URL(string: "\(AppConfig.apiUrl)/dashboard/stats") else { return }
        await performFetch(url: url) { (data: DashboardStats) in
            // Update specific stats from API
            self.dashboardStats.soldCount = data.soldCount
            self.dashboardStats.inventoryCount = data.inventoryCount
            self.dashboardStats.totalRevenue = data.totalRevenue
            self.dashboardStats.totalPaid = data.totalPaid
            self.dashboardStats.totalDebt = data.totalDebt
            self.dashboardStats.totalCapital = data.totalCapital
            self.dashboardStats.expectedTotalRevenue = data.expectedTotalRevenue
            
            self.calculateDashboardStats()
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
                for i in 0..<self.invoices.count {
                    if self.invoices[i].buyerPhone == oldPhone || self.invoices[i].buyerPhone == customer.phone {
                        self.invoices[i].buyerName = customer.name
                        self.invoices[i].buyerPhone = customer.phone
                        self.invoices[i].buyerAddress = customer.address
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
        // We use a temporary stats object to avoid unnecessary UI refreshes during calculation
        var stats = DashboardStats()
        
        // 1. Separate actual invoices from manual debt (following Web logic)
        let actualInvoices = invoices.filter { !($0.id.hasPrefix("MANUAL-")) }
        
        // Revenue, Paid, and Profit only count ACTUAL invoices
        stats.totalRevenue = actualInvoices.reduce(0) { $0 + $1.totalAmount }
        stats.totalPaid = actualInvoices.reduce(0) { $0 + ($1.amountPaid ?? 0) }
        
        // Total Debt includes EVERYTHING (Actual + Manual)
        stats.totalDebt = invoices.reduce(0) { $0 + ($1.debt ?? 0) }
        
        // Profit is calculated only on ACTUAL invoices
        stats.totalProfit = actualInvoices.reduce(0) { sum, inv in
            let revenue = inv.totalAmount
            let cost = inv.products?.reduce(0) { $0 + ($1.originalPrice ?? 0) } ?? 0
            return sum + (revenue - cost)
        }
        
        // 2. Counts and Values - Priority to API Stats if available
        // Local calculation as fallback or for immediate feedback
        let unsoldProducts = products.filter { !($0.sale ?? false) }
        
        // If we have stats from API, we MUST prioritize them because they represent global data
        // whereas local products array might be paged.
        if dashboardStats.inventoryCount > 0 || dashboardStats.soldCount > 0 {
            stats.soldCount = dashboardStats.soldCount
            stats.inventoryCount = dashboardStats.inventoryCount
            stats.totalCapital = dashboardStats.totalCapital
            stats.expectedTotalRevenue = dashboardStats.expectedTotalRevenue
        } else {
            // Fallback calculation from local data
            stats.soldCount = actualInvoices.reduce(0) { $0 + ($1.products?.count ?? 1) }
            stats.inventoryCount = unsoldProducts.count
            
            let unsoldCapital = unsoldProducts.reduce(0) { $0 + ($1.originalPrice ?? 0) }
            let soldCapital = actualInvoices.reduce(0) { sum, inv in
                inv.products?.reduce(0) { $0 + ($1.originalPrice ?? 0) } ?? 0
            }
            stats.totalCapital = unsoldCapital + soldCapital
            
            let currentUnsoldRevenue = unsoldProducts.reduce(0) { $0 + ($1.sellingPrice ?? 0) }
            stats.expectedTotalRevenue = stats.totalRevenue + currentUnsoldRevenue
        }
        
        // 3. Time-series (Last 7 Days) - Always local based on what we have
        let calendar = Calendar.current
        let today = calendar.startOfDay(for: Date())
        var sevenDayData: [Date: Int] = [:]
        
        for i in 0..<7 {
            if let date = calendar.date(byAdding: .day, value: -i, to: today) {
                sevenDayData[date] = 0
            }
        }
        
        for invoice in actualInvoices {
            let invDate = calendar.startOfDay(for: invoice.dateObject)
            if sevenDayData[invDate] != nil {
                sevenDayData[invDate]! += invoice.totalAmount
            }
        }
        stats.last7DaysRevenue = sevenDayData
        
        // Final update to publishable property
        self.dashboardStats = stats
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
    
    func updateProduct(_ product: Product) async throws {
        guard let url = URL(string: "\(AppConfig.apiUrl)/products/\(product.id)") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = UserDefaults.standard.string(forKey: "token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        request.httpBody = try JSONEncoder().encode(product)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            if httpResponse.statusCode == 200 {
                // Update local array immediately to reflect changes
                if let index = self.products.firstIndex(where: { $0.id == product.id }) {
                    self.products[index] = product
                }
                
                self.calculateDashboardStats() // Recalculate stats with new prices
            } else {
                if let errorJson = String(data: data, encoding: .utf8) {
                    print("DataManager Error: Update Product failed (\(httpResponse.statusCode)): \(errorJson)")
                }
                throw AppError.loginFailed(message: "Không thể cập nhật sản phẩm. Mã lỗi \(httpResponse.statusCode).")
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
            if httpResponse.statusCode == 200 || httpResponse.statusCode == 201 {
                await fetchInvoices() // Refresh
                await fetchDashboardStats() // Refresh Dashboard data
                await fetchProducts(page: 1) // Refresh products to hide sold ones
            } else {
                if let errorJson = String(data: data, encoding: .utf8) {
                    print("DataManager Error: Add Invoice failed (\(httpResponse.statusCode)): \(errorJson)")
                }
                throw AppError.loginFailed(message: "Không thể lưu hóa đơn. Máy chủ trả về lỗi \(httpResponse.statusCode).")
            }
        }
    }
    
    func updateInvoice(_ invoice: Invoice) async throws {
        guard let url = URL(string: "\(AppConfig.apiUrl)/invoices/\(invoice.id)") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let token = UserDefaults.standard.string(forKey: "token") {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        request.httpBody = try JSONEncoder().encode(invoice)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            if httpResponse.statusCode == 200 {
                // Update local array immediately
                if let index = self.invoices.firstIndex(where: { $0.id == invoice.id }) {
                    self.invoices[index] = invoice
                }
                self.calculateDashboardStats() // Refresh statistics
            } else {
                if let errorJson = String(data: data, encoding: .utf8) {
                    print("DataManager Error: Update Invoice failed (\(httpResponse.statusCode)): \(errorJson)")
                }
                throw AppError.loginFailed(message: "Không thể cập nhật hóa đơn. Mã lỗi \(httpResponse.statusCode).")
            }
        }
    }
    
    func updateFCMToken(_ token: String) async {
        guard let url = URL(string: "\(AppConfig.apiUrl)/settings") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let authToken = UserDefaults.standard.string(forKey: "token") {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        }
        
        let body = ["fcm_token": token]
        request.httpBody = try? JSONEncoder().encode(body)
        
        do {
            let (_, response) = try await URLSession.shared.data(for: request)
            if let httpResponse = response as? HTTPURLResponse {
                print("DataManager: FCM Token update status: \(httpResponse.statusCode)")
            }
        } catch {
            print("DataManager Error: Failed to update FCM token - \(error.localizedDescription)")
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
