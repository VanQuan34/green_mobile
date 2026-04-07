import SwiftUI

struct MainTabView: View {
    @EnvironmentObject var authManager: AuthManager
    @EnvironmentObject var dataManager: DataManager
    
    var body: some View {
        TabView {
            DashboardView()
                .tabItem {
                    Label("Thống kê", systemImage: "chart.bar.fill")
                }
            
            InvoiceListView()
                .tabItem {
                    Label("Hóa đơn", systemImage: "doc.text.fill")
                }
            
            ProductListView()
                .tabItem {
                    Label("Sản phẩm", systemImage: "cart.fill")
                }
            
            SettingsView()
                .tabItem {
                    Label("Cài đặt", systemImage: "gearshape.fill")
                }
        }
        .accentColor(.green)
        .onAppear {
            Task {
                await dataManager.fetchInitialData()
            }
        }
    }
}

#Preview {
    MainTabView()
        .environmentObject(AuthManager.shared)
        .environmentObject(DataManager.shared)
}
