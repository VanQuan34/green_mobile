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
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
      { 
        path: 'dashboard', 
        loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent) 
      },
      { 
        path: 'products', 
        loadComponent: () => import('./pages/product-list/product-list').then(m => m.ProductListComponent) 
      },
      { 
        path: 'invoices', 
        loadComponent: () => import('./pages/invoice-list/invoice-list').then(m => m.InvoiceListComponent) 
      },
      { 
        path: 'debts', 
        loadComponent: () => import('./pages/debt-list/debt-list').then(m => m.DebtListComponent) 
      },
      { 
        path: 'settings', 
        loadComponent: () => import('./pages/settings/settings').then(m => m.SettingsComponent) 
      },
      { 
        path: 'customers', 
        loadComponent: () => import('./pages/customer-list/customer-list').then(m => m.CustomerListComponent) 
      }
    ]
  },
  { path: '**', redirectTo: '/login' }
];
