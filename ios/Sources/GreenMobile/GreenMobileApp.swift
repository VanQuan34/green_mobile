import SwiftUI

struct SplashView: View {
    @State private var startAnimation = false
    @State private var phase: CGFloat = 0
    @State private var progress: CGFloat = 0
    @State private var logoScale: CGFloat = 0.8
    @State private var logoOpacity: Double = 0
    @State private var shadowRadius: CGFloat = 0
    
    var body: some View {
        ZStack {
            // 1. Dynamic Background (Emerald Gradient)
            LinearGradient(
                colors: [
                    Color(hex: "#064E3B"), // Dark Emerald
                    Color(hex: "#065F46"), // Emerald
                    Color(hex: "#059669")  // Light Emerald
                ],
                startPoint: startAnimation ? .topLeading : .bottomTrailing,
                endPoint: startAnimation ? .bottomTrailing : .topLeading
            )
            .ignoresSafeArea()
            .onAppear {
                withAnimation(.linear(duration: 5).repeatForever(autoreverses: true)) {
                    startAnimation.toggle()
                }
            }
            
            // Background Mesh/Shimmer
            GeometryReader { geo in
                ZStack {
                    Circle()
                        .fill(Color(hex: "#10B981").opacity(0.15))
                        .frame(width: 400, height: 400)
                        .blur(radius: 60)
                        .offset(x: startAnimation ? geo.size.width * 0.2 : -geo.size.width * 0.2,
                                y: startAnimation ? geo.size.height * 0.2 : -geo.size.height * 0.2)
                }
            }
            
            VStack(spacing: 40) {
                Spacer()
                
                // 2. Logo Morphing & Neon Shadow
                ZStack {
                    // Neon Glow
                    RoundedRectangle(cornerRadius: 32)
                        .fill(Color(hex: "#34D399").opacity(0.3))
                        .frame(width: 140, height: 140)
                        .blur(radius: shadowRadius)
                        .scaleEffect(startAnimation ? 1.1 : 0.9)
                    
                    Image("LaunchIcon")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 130, height: 130)
                        .cornerRadius(30)
                        .shadow(color: Color(hex: "#34D399").opacity(0.5), radius: shadowRadius, x: 0, y: 0)
                }
                .scaleEffect(logoScale)
                .opacity(logoOpacity)
                
                VStack(spacing: 12) {
                    Text("DAN MOBILE")
                        .font(.system(size: 38, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                        .kerning(4)
                        .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: 5)
                    
                    Text("PREMIUM MANAGEMENT")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(Color(hex: "#A7F3D0"))
                        .kerning(3)
                }
                .offset(y: startAnimation ? 0 : 5)
                .opacity(logoOpacity)
                
                Spacer()
                
                // 3. Apple-style Progress Bar
                VStack(spacing: 15) {
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color.white.opacity(0.15))
                            .frame(width: 220, height: 4)
                        
                        Capsule()
                            .fill(
                                LinearGradient(
                                    colors: [Color(hex: "#34D399"), Color(hex: "#6EE7B7")],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: 220 * progress, height: 4)
                            .shadow(color: Color(hex: "#34D399").opacity(0.5), radius: 4, x: 0, y: 0)
                    }
                    
                    Text("INITIALIZING SYSTEM")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundColor(.white.opacity(0.6))
                        .kerning(1)
                }
                .padding(.bottom, 50)
            }
        }
        .onAppear {
            // Start Opening Animation
            withAnimation(.spring(response: 0.8, dampingFraction: 0.7, blendDuration: 0).delay(0.2)) {
                logoScale = 1.0
                logoOpacity = 1.0
                shadowRadius = 25
            }
            
            // Haptic Feedback 1: Start
            triggerHaptic(.soft)
            
            // Progress Animation
            withAnimation(.easeOut(duration: 1.8).delay(0.5)) {
                progress = 1.0
            }
            
            // Haptic Feedback 2: Mid
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                triggerHaptic(.light)
            }
            
            // Haptic Feedback 3: End
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.8) {
                triggerHaptic(.medium)
            }
        }
    }
    
    enum HapticType {
        case soft, light, medium
    }
    
    func triggerHaptic(_ type: HapticType) {
        let generator: UIImpactFeedbackGenerator
        switch type {
        case .soft: generator = UIImpactFeedbackGenerator(style: .soft)
        case .light: generator = UIImpactFeedbackGenerator(style: .light)
        case .medium: generator = UIImpactFeedbackGenerator(style: .medium)
        }
        generator.prepare()
        generator.impactOccurred()
    }
}

@main
struct GreenMobileApp: App {
    @StateObject private var authManager = AuthManager.shared
    @StateObject private var dataManager = DataManager.shared
    
    @State private var showSplash = true
    
    var body: some Scene {
        WindowGroup {
            if showSplash {
                SplashView()
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                            withAnimation {
                                self.showSplash = false
                            }
                        }
                    }
            } else {
                if authManager.isLoggedIn {
                    MainTabView()
                        .environmentObject(authManager)
                        .environmentObject(dataManager)
                } else {
                    LoginView()
                        .environmentObject(authManager)
                }
            }
        }
    }
}
