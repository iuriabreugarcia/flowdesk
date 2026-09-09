import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent)
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent)
      },
      {
        path: 'clientes',
        loadComponent: () =>
          import('./features/customers/customers.component').then((m) => m.CustomersComponent)
      },
      {
        path: 'ordens',
        loadComponent: () =>
          import('./features/orders/orders.component').then((m) => m.OrdersComponent)
      },
      {
        path: 'produtos',
        loadComponent: () =>
          import('./features/products/products.component').then((m) => m.ProductsComponent)
      },
      {
        path: 'estoque',
        loadComponent: () =>
          import('./features/inventory/inventory.component').then((m) => m.InventoryComponent)
      },
      {
        path: 'relatorios',
        loadComponent: () =>
          import('./features/reports/reports.component').then((m) => m.ReportsComponent)
      },
      {
        path: 'equipe',
        canActivate: [roleGuard],
        data: { roles: ['OWNER', 'ADMIN'] },
        loadComponent: () =>
          import('./features/team/team.component').then((m) => m.TeamComponent)
      },
      {
        path: '403',
        loadComponent: () =>
          import('./features/errors/forbidden.component').then((m) => m.ForbiddenComponent)
      },
      {
        path: '404',
        loadComponent: () =>
          import('./features/errors/not-found.component').then((m) => m.NotFoundComponent)
      }
    ]
  },
  { path: '**', redirectTo: '404' }
];
