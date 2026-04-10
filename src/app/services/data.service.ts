import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map, of, tap, catchError, throwError, finalize, timer, forkJoin, timeout } from 'rxjs';
import { Product, Invoice, MediaItem, DashboardStats, Customer } from '../models/data.models';
import { HttpClient } from '@angular/common/http';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiUrl = process.env['NG_APP_API_URL'] || 'https://quantv.store/wp-json/gm/v1';
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private authService = inject(AuthService);

  private productsSubject = new BehaviorSubject<Product[]>([]);
  private invoicesSubject = new BehaviorSubject<Invoice[]>([]);
  private customersSubject = new BehaviorSubject<Customer[]>([]);
  private statsSubject = new BehaviorSubject<DashboardStats | null>(null);
  private settingsSubject = new BehaviorSubject<any>({});
  private initializedSubject = new BehaviorSubject<boolean>(false);

  customers$ = this.customersSubject.asObservable();
  products$ = this.productsSubject.asObservable().pipe(
    map(list => list.filter(p => !p.sale))
  );
  invoices$ = this.invoicesSubject.asObservable();
  stats$ = this.statsSubject.asObservable();
  settings$ = this.settingsSubject.asObservable();
  initialized$ = this.initializedSubject.asObservable();

  constructor() {
    // Không gọi loadInitialData ở đây nữa
    this.authService.isLoggedIn$.subscribe(isLoggedIn => {
      if (isLoggedIn) {
        this.loadInitialData();
      } else {
        this.clearData();
        // Mặc định loading mỗi lần vào site là 500ms rồi mới hiện trang login
        timer(500).subscribe(() => this.initializedSubject.next(true));
      }
    });
  }

  private clearData() {
    this.productsSubject.next([]);
    this.invoicesSubject.next([]);
    this.customersSubject.next([]);
    this.statsSubject.next(null);
    this.settingsSubject.next({});
  }

  loadInitialData() {
    // Đảm bảo chỉ load khi thực sự đã login và chưa có dữ liệu quan trọng
    // Hoặc cho phép load lại mỗi khi login mới
    this.loadApiData();
  }

  private loadApiData() {
    // Tải sản phẩm từ API (Đã chuyển sang phân trang phía Server, lược bỏ call tại đây để tránh lặp)
    // this.http.get<Product[]>(`${this.apiUrl}/products`).subscribe((products: Product[]) => {
    //   this.productsSubject.next(products);
    // });

    // Tải hóa đơn từ API
    this.http.get<Invoice[]>(`${this.apiUrl}/invoices`).subscribe((invoices: Invoice[]) => {
      this.invoicesSubject.next(invoices);
    });

    // Tải khách hàng từ API và cập nhật Cache mỗi lần vào site
    this.http.get<Customer[]>(`${this.apiUrl}/customers`).subscribe((customers: Customer[]) => {
      this.customersSubject.next(customers);
    });

    // Tải thống kê dashboard
    this.getDashboardStats().subscribe();

    // Tải cấu hình hệ thống - Đây là bước quan trọng nhất để ẩn splash screen
    // Chờ tối thiểu 500ms, tối đa 5000ms
    forkJoin([
      this.getSettings().pipe(catchError(() => of(null))),
      timer(1000)
    ]).pipe(
      timeout(5000),
      catchError(() => of(null)), // Nếu timeout thì cũng coi như xong để vào app
      finalize(() => this.initializedSubject.next(true))
    ).subscribe();
  }

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/stats`).pipe(
      tap(stats => this.statsSubject.next(stats)),
      catchError(err => {
        console.error('Lỗi khi tải thống kê Dashboard', err);
        return throwError(() => err);
      })
    );
  }
  getLatestStats(): DashboardStats | null {
    return this.statsSubject.value;
  }

  // Product Methods
  getProducts(): Product[] {
    return this.productsSubject.value;
  }

  getProductsPaginated(page: number, perPage: number, search?: string): Observable<{ products: Product[], total: number }> {
    let params: any = { page, per_page: perPage };
    if (search) params.search = search;

    return this.http.get<Product[]>(`${this.apiUrl}/products`, {
      params,
      observe: 'response'
    }).pipe(
      map(response => {
        const total = parseInt(response.headers.get('X-WP-Total') || '0', 10);
        return {
          products: response.body || [],
          total
        };
      }),
      catchError(err => {
        this.toast.error('Lỗi khi tải danh sách sản phẩm');
        return throwError(() => err);
      })
    );
  }

  addProduct(product: Product): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/products`, product).pipe(
      map(res => res.data || res),
      tap((newProduct: Product) => {
        const current = this.productsSubject.value;
        this.productsSubject.next([newProduct, ...current]);
        this.toast.success('Đã thêm sản phẩm thành công');
      }),
      catchError(err => {
        const errorMsg = err.error?.message || 'Lỗi khi thêm sản phẩm';
        this.toast.error(errorMsg);
        return throwError(() => err);
      })
    );
  }

  updateProduct(product: Product): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/products/${product.id}`, product).pipe(
      map(res => res.data || res),
      tap((newPayload: Product) => {
        const current = this.productsSubject.value;
        const updated = current.map(p => p.id.toString() === product.id.toString() ? { ...p, ...newPayload } : p);
        console.log('update==', updated, 'current==', current, 'newPayload=', newPayload);
        this.productsSubject.next(updated);
        this.toast.success('Cập nhật sản phẩm thành công');
      }),
      catchError(err => {
        const errorMsg = err.error?.message || 'Lỗi khi cập nhật sản phẩm';
        this.toast.error(errorMsg);
        return throwError(() => err);
      })
    );
  }

  deleteProduct(id: string): Observable<any> {
    return of(true);
    console.log('DataService: Bắt đầu xóa sản phẩm với ID:', id);
    const cleanId = id.toString().trim();
    const deleteUrl = `${this.apiUrl}/products/${encodeURIComponent(cleanId)}`;
    console.log('DataService: URL xóa:', deleteUrl);

    return this.http.delete(deleteUrl).pipe(
      tap(() => {
        console.log('DataService: API xóa thành công, đang cập nhật danh sách local...');
        const current = this.productsSubject.value;
        this.productsSubject.next(current.filter(p => p.id.toString() !== cleanId));
        this.toast.success('Đã xóa sản phẩm');
      }),
      catchError(err => {
        console.error('DataService: Lỗi gọi API xóa:', err);
        this.toast.error('Lỗi khi xóa sản phẩm');
        return throwError(() => err);
      })
    );
  }

  // Invoice Methods
  getInvoices(): Invoice[] {
    return this.invoicesSubject.value;
  }

  addInvoice(invoice: Invoice): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/invoices`, invoice).pipe(
      map(res => res.data || res),
      tap((newInvoice: Invoice) => {
        const currentInvoices = this.invoicesSubject.value;
        this.invoicesSubject.next([newInvoice, ...currentInvoices]);
        this.updateCustomerCache(newInvoice);
        this.markProductsAsSold(newInvoice.products || []);
        this.getDashboardStats().subscribe(); // Cập nhật Dashboard ngay lập tức
        this.toast.success('Lập hóa đơn thành công!');
      }),
      catchError(err => {
        this.toast.error('Lỗi khi lập hóa đơn');
        return throwError(() => err);
      })
    );
  }

  private markProductsAsSold(products: Product[]) {
    const currentProducts = this.productsSubject.value;
    const soldIds = products.map(p => p.id.toString());
    const updated = currentProducts.map(p =>
      soldIds.includes(p.id.toString()) ? { ...p, sale: true } : p
    );
    this.productsSubject.next(updated);
  }

  deleteInvoice(id: string): Observable<any> {
    return of(true);
    return this.http.delete(`${this.apiUrl}/invoices/${id}`).pipe(
      tap(() => {
        const current = this.invoicesSubject.value;
        const updated = current.filter(i => i.id.toString() !== id.toString());
        this.invoicesSubject.next(updated);
        this.toast.success('Đã xóa hóa đơn');
      }),
      catchError(err => {
        this.toast.error('Lỗi khi xóa hóa đơn');
        return throwError(() => err);
      })
    );
  }

  updateInvoice(invoice: Invoice): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/invoices/${invoice.id}`, invoice).pipe(
      map(res => res.data || res),
      tap((newPayload: Invoice) => {
        const current = this.invoicesSubject.value;
        const updated = current.map(i => i.id.toString() === invoice.id.toString() ? { ...i, ...newPayload } : i);
        this.invoicesSubject.next(updated);
        this.updateCustomerCache(invoice);
        this.toast.success('Đã cập nhật hóa đơn');
      }),
      catchError(err => {
        this.toast.error('Lỗi khi cập nhật hóa đơn');
        return throwError(() => err);
      })
    );
  }

  getInvoicesByDateRange(startDate: string, endDate: string): Observable<Invoice[]> {
    return this.http.get<Invoice[]>(`${this.apiUrl}/invoices`, {
      params: {
        from_date: startDate,
        to_date: endDate
      }
    }).pipe(
      catchError(err => {
        this.toast.error('Lỗi khi tải dữ liệu xuất');
        return throwError(() => err);
      })
    );
  }

  // Settings Methods
  getSettings(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/settings`).pipe(
      tap(settings => this.settingsSubject.next(settings)),
      catchError(err => {
        this.toast.error('Lỗi khi tải cấu hình');
        return throwError(() => err);
      })
    );
  }

  updateSettings(settings: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/settings`, settings).pipe(
      tap(() => {
        const current = this.settingsSubject.value;
        this.settingsSubject.next({ ...current, ...settings });
        this.toast.success('Đã cập nhật cấu hình hệ thống');
      }),
      catchError(err => {
        this.toast.error('Lỗi khi lưu cấu hình');
        return throwError(() => err);
      })
    );
  }

  private updateCustomerCache(invoice: Invoice) {
    const current = this.customersSubject.value;
    const exists = current.find(c => c.phone === invoice.buyerPhone);

    const customerUpdate: Customer = {
      p_id: exists ? exists.p_id : 0, // Dùng ID hiện có hoặc 0 nếu mới
      name: invoice.buyerName,
      phone: invoice.buyerPhone,
      address: invoice.buyerAddress
    };

    let updated: Customer[];
    if (exists) {
      updated = current.map(c => c.phone === invoice.buyerPhone ? customerUpdate : c);
    } else {
      updated = [...current, customerUpdate];
    }

    this.customersSubject.next(updated);
  }

  // Get unique customers from sync cache (always refreshed at startup)
  getExistingCustomers(): Observable<Customer[]> {
    return this.customers$;
  }

  updateCustomer(customer: Customer): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/customers/${customer.p_id}`, customer).pipe(
      tap(() => {
        // 1. Cập nhật danh sách khách hàng
        const currentCustomers = this.customersSubject.value;
        const updatedCustomers = currentCustomers.map(c => c.p_id === customer.p_id ? customer : c);
        this.customersSubject.next(updatedCustomers);

        // 2. Cập nhật thông tin hiển thị trong danh sách hóa đơn (và công nợ)
        const currentInvoices = this.invoicesSubject.value;
        const updatedInvoices = currentInvoices.map(inv => {
          // So khớp dựa trên p_id nếu sau này Invoice có p_id, hiện tại dùng phone là định danh ổn định nhất từ Backend join
          // Để an toàn, ta cập nhật tất cả hóa đơn có cùng số điện thoại cũ của khách hàng này
          // Tìm khách hàng cũ để lấy phone trùng khớp nếu phone vừa bị đổi
          const oldCustomer = currentCustomers.find(c => c.p_id === customer.p_id);
          if (inv.buyerPhone === oldCustomer?.phone || inv.buyerPhone === customer.phone) {
            return {
              ...inv,
              buyerName: customer.name,
              buyerPhone: customer.phone,
              buyerAddress: customer.address
            };
          }
          return inv;
        });
        this.invoicesSubject.next(updatedInvoices);

        this.toast.success('Cập nhật thông tin khách hàng thành công');
      }),
      catchError(err => {
        this.toast.error('Lỗi khi cập nhật khách hàng');
        return throwError(() => err);
      })
    );
  }

  // Currency Utilities
  formatVND(value: number | string): string {
    if (value === undefined || value === null) return '';
    const num = typeof value === 'string' ? parseInt(value.replace(/\D/g, ''), 10) : value;
    if (isNaN(num)) return '';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  parseVND(value: string): number {
    if (!value) return 0;
    const cleanValue = value.toString().replace(/\D/g, '');
    return parseInt(cleanValue, 10) || 0;
  }

  numberToVietnameseWords(n: number): string {
    if (n === 0) return 'Không đồng';

    const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];

    function readThree(num: number, hasHundred: boolean): string {
      let hundred = Math.floor(num / 100);
      let ten = Math.floor((num % 100) / 10);
      let unit = num % 10;
      let res = '';

      if (hasHundred || hundred > 0) {
        res += digits[hundred] + ' trăm ';
      }

      if (ten > 1) {
        res += digits[ten] + ' mươi ';
      } else if (ten === 1) {
        res += 'mười ';
      } else if (hundred > 0 && unit > 0) {
        res += 'linh ';
      }

      if (unit > 0) {
        if (unit === 1 && ten > 1) res += 'mốt';
        else if (unit === 5 && ten > 0) res += 'lăm';
        else res += digits[unit];
      }

      return res.trim();
    }

    let res = '';
    let unitIdx = 0;
    let temp = n;

    while (temp > 0) {
      let block = temp % 1000;
      if (block > 0) {
        let s = readThree(block, temp >= 1000);
        res = s + ' ' + units[unitIdx] + ' ' + res;
      }
      temp = Math.floor(temp / 1000);
      unitIdx++;
    }

    res = res.trim();
    if (res.startsWith('không trăm')) {
      res = res.replace('không trăm ', '');
    }

    return res.charAt(0).toUpperCase() + res.slice(1).trim() + ' đồng';
  }

  // Media Methods
  getMedia(page: number, perPage: number, search?: string, order: 'DESC' | 'ASC' = 'DESC'): Observable<{ media: MediaItem[], total: number }> {
    let params: any = { page, per_page: perPage, order };
    if (search) params.search = search;

    return this.http.get<MediaItem[]>(`${this.apiUrl}/media`, {
      params,
      observe: 'response'
    }).pipe(
      map(response => {
        const total = parseInt(response.headers.get('X-WP-Total') || '0', 10);
        return {
          media: response.body || [],
          total
        };
      }),
      catchError(err => {
        this.toast.error('Lỗi khi tải thư viện ảnh');
        return throwError(() => err);
      })
    );
  }

  uploadMedia(file: File): Observable<MediaItem> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<MediaItem>(`${this.apiUrl}/media`, formData).pipe(
      tap(() => this.toast.success('Tải ảnh lên thành công')),
      catchError(err => {
        this.toast.error('Lỗi khi tải ảnh lên');
        return throwError(() => err);
      })
    );
  }
}
