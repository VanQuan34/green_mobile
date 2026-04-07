import SwiftUI

struct SettingsView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var notificationsEnabled = true
    @State private var darkModeEnabled = false
    
    var body: some View {
        NavigationView {
            Form {
                Section(header: Text("Tài khoản")) {
                    HStack {
                        Image(systemName: "person.circle.fill")
                            .resizable()
                            .frame(width: 40, height: 40)
                            .foregroundColor(.gray)
                        VStack(alignment: .leading) {
                            Text(authManager.user?.display_name ?? "User Name")
                                .font(.headline)
                            Text(authManager.user?.user_nicename ?? "@user")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                }
                
                Section(header: Text("Cấu hình hệ thống")) {
                    Toggle("Thông báo", isOn: $notificationsEnabled)
                    Toggle("Chế độ tối", isOn: $darkModeEnabled)
                    
                    HStack {
                        Text("API URL")
                        Spacer()
                        Text(AppConfig.apiUrl)
                            .font(.caption)
                            .foregroundColor(.blue)
                    }
                }
                
                Section(header: Text("Thông tin ứng dụng")) {
                    HStack {
                        Text("Phiên bản")
                        Spacer()
                        Text("1.0.0 (Native)")
                            .foregroundColor(.secondary)
                    }
                    NavigationLink(destination: Text("Chính sách bảo mật")) {
                        Text("Chính sách bảo mật")
                    }
                }
                
                Section {
                    Button(action: {
                        authManager.logout()
                    }) {
                        Text("Đăng xuất")
                            .foregroundColor(.red)
                            .frame(maxWidth: .infinity, alignment: .center)
                    }
                }
            }
            .navigationTitle("Cài đặt")
        }
    }
}

#Preview {
    SettingsView().environmentObject(AuthManager.shared)
}
