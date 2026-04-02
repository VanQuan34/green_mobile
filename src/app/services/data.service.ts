import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Product, Invoice } from '../models/data.models';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private productsSubject = new BehaviorSubject<Product[]>([]);
  private invoicesSubject = new BehaviorSubject<Invoice[]>([]);

  products$ = this.productsSubject.asObservable().pipe(
    map(list => list.filter(p => !p.sale))
  );
  invoices$ = this.invoicesSubject.asObservable();

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData() {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const invoices = JSON.parse(localStorage.getItem('invoices') || '[]');
    this.productsSubject.next(products);
    this.invoicesSubject.next(invoices);
  }

  // Product Methods
  getProducts(): Product[] {
    return this.productsSubject.value;
  }

  addProduct(product: Product) {
    const current = this.getProducts();
    const updated = [...current, { ...product, id: Date.now().toString(), sale: false }];
    this.saveProducts(updated);
  }

  updateProduct(product: Product) {
    const current = this.getProducts();
    const updated = current.map(p => p.id === product.id ? product : p);
    this.saveProducts(updated);
  }

  deleteProduct(id: string) {
    const current = this.getProducts();
    const updated = current.filter(p => p.id !== id);
    this.saveProducts(updated);
  }

  private saveProducts(products: Product[]) {
    localStorage.setItem('products', JSON.stringify(products));
    this.productsSubject.next(products);
  }

  // Invoice Methods
  getInvoices(): Invoice[] {
    return this.invoicesSubject.value;
  }

  addInvoice(invoice: Invoice) {
    const currentInvoices = this.getInvoices();
    const updatedInvoices = [...currentInvoices, { ...invoice, id: Date.now().toString(), createdAt: new Date() }];
    this.saveInvoices(updatedInvoices);

    // Cập nhật trạng thái sản phẩm là Đã bán
    const currentProducts = this.getProducts();
    const updatedProducts = currentProducts.map(p => 
      p.id === invoice.productId ? { ...p, sale: true } : p
    );
    this.saveProducts(updatedProducts);
  }

  deleteInvoice(id: string) {
    const current = this.getInvoices();
    const updated = current.filter(i => i.id !== id);
    this.saveInvoices(updated);
  }

  private saveInvoices(invoices: Invoice[]) {
    localStorage.setItem('invoices', JSON.stringify(invoices));
    this.invoicesSubject.next(invoices);
  }

  // Get unique customers for autocomplete
  getExistingCustomers() {
    const invoices = this.getInvoices();
    const customers = invoices.map(i => ({
      name: i.buyerName,
      address: i.buyerAddress,
      phone: i.buyerPhone
    }));
    // Remove duplicates by phone
    return Array.from(new Map(customers.map(c => [c.phone, c])).values());
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
