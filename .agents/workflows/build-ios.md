---
description: Build và chạy ứng dụng iOS Green Mobile trên Xcode
---

Workflow này hướng dẫn quy trình chuyển đổi và build dự án iOS bản địa từ mã nguồn Swift.

### 1. Chuẩn bị môi trường (Prerequisites)
Bạn cần cài đặt Xcode phiên bản 15.0 trở lên và Swift 5.9+.

### 2. Khởi tạo dự án iOS (Nếu chưa có)
Nếu bạn chưa tạo project iOS, hãy chạy lệnh sau để chuẩn bị thư mục:
// turbo
```bash
mkdir -p ios-app && cd ios-app
```

### 3. Cài đặt các Dependency (Swift Package Manager)
Mở dự án trên Xcode và thêm các package sau qua `File -> Add Packages...`:
- `https://github.com/apple/swift-charts` (Native Charts)
- `https://github.com/CoreOffice/LibXLSXWriter` (Sử dụng cho Export Excel)

### 4. Cấu hình Signing & Capabilities (Manual)
Mở file `.xcodeproj` trong Xcode:
1. Chọn tab **Signing & Capabilities**.
2. Chọn **Team** phù hợp (Apple ID của bạn).
3. Đảm bảo **Bundle Identifier** là `com.greenmobile.app`.

### 5. Build dự án qua Command Line
Sử dụng `xcodebuild` để kiểm tra độ chính xác của code:
// turbo
```bash
xcodebuild -project GreenMobile.xcodeproj -scheme GreenMobile -sdk iphonesimulator -configuration Debug build
```

### 6. Chạy trên Simulator
Để chạy trực tiếp từ terminal lên simulator (Yêu cầu Xcode đang mở):
// turbo
```bash
xcrun simctl install booted GreenMobile.app
xcrun simctl launch booted com.greenmobile.app
```

> [!TIP]
> Bạn nên thực hiện việc code và design UI trực tiếp trên Xcode để tận dụng tính năng **SwiftUI Preview** (Command + Option + P) giúp xem thay đổi giao diện theo thời gian thực.
