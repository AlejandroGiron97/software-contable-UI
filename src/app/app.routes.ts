import { Routes } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { ShellComponent } from './layout/shell/shell.component';

export const routes: Routes = [
  { path: '', component: LandingComponent, pathMatch: 'full' },
  {
    path: '',
    component: ShellComponent,
    children: [
      { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'ahorro', loadComponent: () => import('./pages/savings/savings.component').then(m => m.SavingsComponent) },
      { path: 'cuotas-extraordinarias', loadComponent: () => import('./pages/extra-fees/extra-fees.component').then(m => m.ExtraFeesComponent) },
      { path: 'cuotas-extraordinarias/:id', loadComponent: () => import('./pages/extra-fees/extra-fee-detail.component').then(m => m.ExtraFeeDetailComponent) },
    ],
  },
  { path: '**', redirectTo: '' },
];
