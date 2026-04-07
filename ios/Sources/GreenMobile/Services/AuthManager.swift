import Foundation
import SwiftUI
import Combine

class AuthManager: ObservableObject {
    static let shared = AuthManager()
    
    @Published var isLoggedIn: Bool = false
    @Published var user: User?
    
    private let apiUrl = "https://quantv.store/wp-json/gm/v1"
    private var cancellables = Set<AnyCancellable>()
    
    private init() {
        if let token = UserDefaults.standard.string(forKey: "token") {
            self.isLoggedIn = true
            // Ở đây có thể load thêm profile user từ UserDefaults
        }
    }
    
    func login(username: String, password: String) async throws {
        guard let url = URL(string: "\(apiUrl)/login") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["username": username, "password": password]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        print("AuthManager: Attempting login for \(username) to \(url)")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        #if DEBUG
        if let jsonString = String(data: data, encoding: .utf8) {
            print("AuthManager Response: \(jsonString)")
        }
        #endif
        
        guard let httpResponse = response as? HTTPURLResponse else {
            print("AuthManager Error: No HTTP response")
            throw AppError.loginFailed(message: "Không nhận được phản hồi từ máy chủ.")
        }
        
        print("AuthManager Status Code: \(httpResponse.statusCode)")
        
        guard httpResponse.statusCode == 200 else {
            let serverError = try? JSONDecoder().decode(ServerError.self, from: data)
            let message = serverError?.message ?? "Lỗi đăng nhập (Mã: \(httpResponse.statusCode))"
            print("AuthManager Error: \(message)")
            throw AppError.loginFailed(message: message)
        }
        
        do {
            let result = try JSONDecoder().decode(LoginResponse.self, from: data)
            DispatchQueue.main.async {
                UserDefaults.standard.set(result.token, forKey: "token")
                self.user = result.user
                self.isLoggedIn = true
            }
            print("AuthManager: Login successful for \(result)")
        } catch {
            print("AuthManager Decoding Error: \(error)")
            #if DEBUG
            throw AppError.loginFailed(message: "Lỗi xử lý dữ liệu: \(error.localizedDescription)")
            #else
            throw AppError.loginFailed(message: "Lỗi xử lý dữ liệu từ máy chủ.")
            #endif
        }
    }
    
    // Structure for WordPress errors
    struct ServerError: Codable {
        let code: String
        let message: String
    }
    
    func logout() {
        UserDefaults.standard.removeObject(forKey: "token")
        self.isLoggedIn = false
        self.user = nil
    }
}

enum AppError: LocalizedError {
    case loginFailed(message: String)
    
    var errorDescription: String? {
        switch self {
        case .loginFailed(let message): return message
        }
    }
}

struct LoginResponse: Codable {
    let token: String?
    let user: User?
}

struct User: Codable {
    let id: String?
    let display_name: String?
    let user_nicename: String?
    
    enum CodingKeys: String, CodingKey {
        case id, display_name, user_nicename
    }
    
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        
        // Handle ID as either Int or String
        if let idInt = try? container.decode(Int.self, forKey: .id) {
            self.id = String(idInt)
        } else if let idStr = try? container.decode(String.self, forKey: .id) {
            self.id = idStr
        } else {
            self.id = nil
        }
        
        self.display_name = try? container.decode(String.self, forKey: .display_name)
        self.user_nicename = try? container.decode(String.self, forKey: .user_nicename)
    }
}
