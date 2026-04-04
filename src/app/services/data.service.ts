import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map, of, tap, catchError, throwError, finalize } from 'rxjs';
import { Product, Invoice } from '../models/data.models';
import { HttpClient } from '@angular/common/http';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiUrl = process.env['NG_APP_API_URL'] || 'https://quantv.store/wp-json/gm/v1';
  private http = inject(HttpClient);
  private toast = inject(ToastService);

  private productsSubject = new BehaviorSubject<Product[]>([]);
  private invoicesSubject = new BehaviorSubject<Invoice[]>([]);
  private customersSubject = new BehaviorSubject<any[]>([]);

  customers$ = this.customersSubject.asObservable();
  products$ = this.productsSubject.asObservable().pipe(
    map(list => list.filter(p => !p.sale))
  );
  invoices$ = this.invoicesSubject.asObservable();

  constructor() {
    this.loadInitialData();
  }

  loadInitialData() {
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
    this.http.get<any[]>(`${this.apiUrl}/customers`).subscribe((customers: any[]) => {
      this.customersSubject.next(customers);
    });
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
      catchError(err => {
        this.toast.error('Lỗi khi tải cấu hình');
        return throwError(() => err);
      })
    );
  }

  updateSettings(settings: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/settings`, settings).pipe(
      tap(() => {
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

    let updated;
    const newCustomer = {
      name: invoice.buyerName,
      phone: invoice.buyerPhone,
      address: invoice.buyerAddress
    };

    if (exists) {
      updated = current.map(c => c.phone === invoice.buyerPhone ? newCustomer : c);
    } else {
      updated = [...current, newCustomer];
    }

    this.customersSubject.next(updated);
  }

  // Get unique customers from sync cache (always refreshed at startup)
  getExistingCustomers(): Observable<any[]> {
    return this.customers$;
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
}
