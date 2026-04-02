import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { 
    path: '', 
    canActivate: [authGuard],
    loadComponent: () => import('./components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: '', redirectTo: 'products', pathMatch: 'full' },
      { 
        path: 'products', 
        loadComponent: () => import('./pages/product-list/product-list').then(m => m.ProductListComponent) 
      },
      { 
        path: 'invoices', 
        loadComponent: () => import('./pages/invoice-list/invoice-list').then(m => m.InvoiceListComponent) 
      }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
