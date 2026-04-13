import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    
    @State private var username = ""
    @State private var password = ""
    @State private var isPasswordVisible = false
    @State private var isLoading = false
    @State private var errorMessage = ""
    
    var body: some View {
        ZStack {
            // Background
            Color(UIColor.systemGroupedBackground).ignoresSafeArea()
            
            VStack(spacing: 35) {
                Spacer()
                
                // Logo & Header
                VStack(spacing: 15) {
                    Image("LaunchIcon")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 80, height: 80)
                        .cornerRadius(16)
                        .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
                    
                    Text("DAN Mobile")
                        .font(.system(size: 32, weight: .bold, design: .rounded))
                        .foregroundColor(AppTheme.textMain)
                    
                    Text("Đăng nhập để quản lý hệ thống")
                        .font(.subheadline)
                        .foregroundColor(AppTheme.textMuted)
                }
                
                // Form
                VStack(alignment: .leading, spacing: 20) {
                    
                    // Username Field
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Tên đăng nhập")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(AppTheme.textMain)
                            .padding(.leading, 4)
                        
                        HStack {
                            Image(systemName: "person")
                                .foregroundColor(AppTheme.textMuted)
                            TextField("Nhập tên đăng nhập...", text: $username)
                                .autocapitalization(.none)
                                .disableAutocorrection(true)
                        }
                        .padding()
                        .background(Color.white)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                        )
                    }
                    
                    // Password Field
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Mật khẩu")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(AppTheme.textMain)
                            .padding(.leading, 4)
                        
                        HStack {
                            Image(systemName: "lock")
                                .foregroundColor(AppTheme.textMuted)
                            
                            if isPasswordVisible {
                                TextField("Nhập mật khẩu...", text: $password)
                            } else {
                                SecureField("Nhập mật khẩu...", text: $password)
                            }
                            
                            Button(action: { isPasswordVisible.toggle() }) {
                                Image(systemName: isPasswordVisible ? "eye.slash" : "eye")
                                    .foregroundColor(AppTheme.textMuted)
                            }
                        }
                        .padding()
                        .background(Color.white)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                        )
                    }
                    
                    if !errorMessage.isEmpty {
                        HStack {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundColor(AppTheme.danger)
                            Text(errorMessage)
                                .font(.system(size: 13))
                                .foregroundColor(AppTheme.danger)
                        }
                        .transition(.opacity)
                        .padding(.leading, 4)
                    }
                }
                .padding(.horizontal, 25)
                
                // Action
                Button(action: login) {
                    Group {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Đăng nhập")
                                .font(.system(size: 17, weight: .bold))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(
                        (username.isEmpty || password.isEmpty) ? 
                        AppTheme.primary.opacity(0.5) : AppTheme.primary
                    )
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .shadow(color: AppTheme.primary.opacity(0.3), radius: 8, x: 0, y: 4)
                }
                .padding(.horizontal, 25)
                .disabled(isLoading || username.isEmpty || password.isEmpty)
                
                Spacer()
                
                // Footer
                Text("Bản quyền © 2026 DAN Mobile")
                    .font(.system(size: 12))
                    .foregroundColor(AppTheme.textMuted)
                    .padding(.bottom, 20)
            }
        }
        .animation(.easeInOut, value: errorMessage)
    }
    
    func login() {
        // Haptic Feedback
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
        
        isLoading = true
        errorMessage = ""
        
        Task {
            do {
                try await authManager.login(username: username, password: password)
                isLoading = false
            } catch let error as LocalizedError {
                isLoading = false
                errorMessage = error.errorDescription ?? "Đăng nhập thất bại."
            } catch {
                isLoading = false
                errorMessage = "Lỗi kết nối máy chủ."
            }
        }
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthManager.shared)
}
