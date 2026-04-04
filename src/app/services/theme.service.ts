import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly root = document.documentElement;

  /**
   * Áp dụng mã màu chính và tự động tính toán các tông màu phụ
   */
  applyTheme(hex: string, save = true) {
    if (!hex || !hex.startsWith('#')) return;
    
    if (save) {
      localStorage.setItem('primary_color', hex);
    }
    
    // Màu chính
    const primary = hex;
    
    // Màu đậm (thường cho hover) - giảm độ sáng khoảng 15%
    const primaryDark = this.shadeColor(hex, -15);
    
    // Màu nhạt (thường cho background nhẹ) - tăng độ sáng lên mức rất cao (92%)
    const primaryLight = this.lightenToBackground(hex);
    
    this.root.style.setProperty('--primary', primary);
    this.root.style.setProperty('--primary-dark', primaryDark);
    this.root.style.setProperty('--primary-light', primaryLight);
    
    // Hiệu ứng bóng đổ/glow (20% độ trong suốt)
    this.root.style.setProperty('--primary-glow', hex + '33');
  }

  /**
   * Tải màu từ localStorage và áp dụng
   */
  loadStoredTheme() {
    const savedColor = localStorage.getItem('primary_color');
    if (savedColor) {
      this.applyTheme(savedColor, false);
      return savedColor;
    }
    return '#10b981'; // Mặc định
  }

  /**
   * Làm đậm hoặc nhạt màu theo tỷ lệ phần trăm
   */
  private shadeColor(color: string, percent: number): string {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = Math.floor(R * (100 + percent) / 100);
    G = Math.floor(G * (100 + percent) / 100);
    B = Math.floor(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    const RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
    const GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
    const BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

    return "#" + RR + GG + BB;
  }

  /**
   * Tạo màu cực nhạt để làm nền (light background)
   */
  private lightenToBackground(color: string): string {
    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    // Tiến hành pha loãng với màu trắng (255) theo tỷ lệ 90% trắng
    const mix = (c: number) => Math.floor(c + (255 - c) * 0.9);
    
    const RR = mix(R).toString(16).padStart(2, '0');
    const GG = mix(G).toString(16).padStart(2, '0');
    const BB = mix(B).toString(16).padStart(2, '0');

    return "#" + RR + GG + BB;
  }

  /**
   * Danh sách các bảng màu mẫu
   */
  getPresets() {
    return [
      { name: 'Xanh Lá (Gốc)', color: '#10b981' },
      { name: 'Xanh Dương', color: '#3b82f6' },
      { name: 'Tím Hiện Đại', color: '#8b5cf6' },
      { name: 'Cam Năng Động', color: '#f59e0b' },
      { name: 'Hồng Quyến Rũ', color: '#ec4899' },
      { name: 'Đỏ Mạnh Mẽ', color: '#ef4444' },
      { name: 'Xanh Slate', color: '#475569' },
      { name: 'Vàng Chanh', color: '#84cc16' }
    ];
  }
}
