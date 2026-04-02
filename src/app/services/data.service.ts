import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product, Invoice } from '../models/data.models';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private productsSubject = new BehaviorSubject<Product[]>([]);
  private invoicesSubject = new BehaviorSubject<Invoice[]>([]);

  products$ = this.productsSubject.asObservable();
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
    const updated = [...current, { ...product, id: Date.now().toString() }];
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
    const current = this.getInvoices();
    const updated = [...current, { ...invoice, id: Date.now().toString(), createdAt: new Date() }];
    this.saveInvoices(updated);
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
}
