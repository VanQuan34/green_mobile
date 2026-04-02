import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map, of } from 'rxjs';
import { Product, Invoice } from '../models/data.models';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private apiUrl = process.env['NG_APP_API_URL'] || 'https://quantv.store/wp-json/gm/v1';
  private storageType = process.env['NG_APP_STORAGE_TYPE'] || 'api';
  private http = inject(HttpClient);
  
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

  private get isLocal(): boolean {
    return this.storageType === 'local';
  }

  loadInitialData() {
    if (this.isLocal) {
      this.loadLocalData();
    } else {
      this.loadApiData();
    }
  }

  private loadApiData() {
    // Tải sản phẩm từ API
    this.http.get<Product[]>(`${this.apiUrl}/products`).subscribe(products => {
      this.productsSubject.next(products);
    });

    // Tải hóa đơn từ API
    this.http.get<Invoice[]>(`${this.apiUrl}/invoices`).subscribe(invoices => {
      this.invoicesSubject.next(invoices);
    });

    // Tải khách hàng từ API và cập nhật Cache mỗi lần vào site
    this.http.get<any[]>(`${this.apiUrl}/customers`).subscribe(customers => {
      this.customersSubject.next(customers);
      localStorage.setItem('gm_customers_cache', JSON.stringify(customers));
    });
  }

  private loadLocalData() {
    const products = JSON.parse(localStorage.getItem('gm_products') || '[]');
    const invoices = JSON.parse(localStorage.getItem('gm_invoices') || '[]');
    const customers = JSON.parse(localStorage.getItem('gm_customers_cache') || '[]');
    
    this.productsSubject.next(products);
    this.invoicesSubject.next(invoices);
    this.customersSubject.next(customers);

    // If local and empty, maybe initialize with some dummy data?
    if (products.length === 0) {
      this.initializeMockData();
    }
  }

  private initializeMockData() {
    const mockProducts: Product[] = [
      { 
        id: '1', 
        name: 'iPhone 15 Pro Max', 
        sellingPrice: 29000000, 
        originalPrice: 32000000,
        image: '', 
        imei: '123456789', 
        capacity: '256GB', 
        color: 'Titanium', 
        status: 'New' 
      },
      { 
        id: '2', 
        name: 'Samsung S24 Ultra', 
        sellingPrice: 25000000, 
        originalPrice: 28000000,
        image: '', 
        imei: '987654321', 
        capacity: '512GB', 
        color: 'Black', 
        status: 'New' 
      }
    ];
    localStorage.setItem('gm_products', JSON.stringify(mockProducts));
    this.productsSubject.next(mockProducts);
  }

  // Product Methods
  getProducts(): Product[] {
    return this.productsSubject.value;
  }

  addProduct(product: Product) {
    if (this.isLocal) {
      const current = this.productsSubject.value;
      const updated = [...current, { ...product, id: Date.now().toString() }];
      this.saveLocal('gm_products', updated, this.productsSubject);
    } else {
      this.http.post(`${this.apiUrl}/products`, product).subscribe(() => {
        this.loadInitialData();
      });
    }
  }

  updateProduct(product: Product) {
    if (this.isLocal) {
      const current = this.productsSubject.value;
      const updated = current.map(p => p.id === product.id ? product : p);
      this.saveLocal('gm_products', updated, this.productsSubject);
    } else {
      this.http.put(`${this.apiUrl}/products/${product.id}`, product).subscribe(() => {
        this.loadInitialData();
      });
    }
  }

  deleteProduct(id: string) {
    if (this.isLocal) {
      const current = this.productsSubject.value;
      const updated = current.filter(p => p.id !== id);
      this.saveLocal('gm_products', updated, this.productsSubject);
    } else {
      this.http.delete(`${this.apiUrl}/products/${id}`).subscribe(() => {
        this.loadInitialData();
      });
    }
  }

  // Invoice Methods
  getInvoices(): Invoice[] {
    return this.invoicesSubject.value;
  }

  addInvoice(invoice: Invoice) {
    if (this.isLocal) {
      const current = this.invoicesSubject.value;
      const newInvoice = { ...invoice, id: Date.now().toString() };
      const updated = [...current, newInvoice];
      this.saveLocal('gm_invoices', updated, this.invoicesSubject);
      this.updateCustomerCache(newInvoice);
      this.markProductsAsSold(invoice.products || []);
    } else {
      this.http.post(`${this.apiUrl}/invoices`, invoice).subscribe(() => {
        this.loadInitialData();
        this.updateCustomerCache(invoice);
      });
    }
  }

  private markProductsAsSold(products: Product[]) {
    if (!this.isLocal) return;
    const currentProducts = this.productsSubject.value;
    const soldIds = products.map(p => p.id);
    const updated = currentProducts.map(p => 
      soldIds.includes(p.id) ? { ...p, sale: true } : p
    );
    this.saveLocal('gm_products', updated, this.productsSubject);
  }

  deleteInvoice(id: string) {
    if (this.isLocal) {
      const current = this.invoicesSubject.value;
      const updated = current.filter(i => i.id !== id);
      this.saveLocal('gm_invoices', updated, this.invoicesSubject);
    } else {
      this.http.delete(`${this.apiUrl}/invoices/${id}`).subscribe(() => {
        this.loadInitialData();
      });
    }
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
    localStorage.setItem('gm_customers_cache', JSON.stringify(updated));
  }

  private saveLocal(key: string, data: any, subject: BehaviorSubject<any>) {
    localStorage.setItem(key, JSON.stringify(data));
    subject.next(data);
  }

  // Get unique customers from sync cache (always refreshed at startup)
  getExistingCustomers(): Observable<any[]> {
    const cached = localStorage.getItem('gm_customers_cache');
    if (cached) {
      return of(JSON.parse(cached));
    } else {
      return this.customers$; // Trả về observable hiện tại nếu cache chưa kịp load
    }
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
      } else if (unit === 0 && hundred === 0 && ten === 0 && !hasHundred) {
        // Just skip
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
