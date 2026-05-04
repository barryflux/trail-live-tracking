import { Routes } from '@angular/router';
import { Tracking } from './pages/tracking/tracking';

export const routes: Routes = [
  {
    path: 'tracking',
    component: Tracking,
  },
  {
    path: '',
    redirectTo: 'tracking',
    pathMatch: 'full',
  },
];