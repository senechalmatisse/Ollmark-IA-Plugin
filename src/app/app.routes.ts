import { Routes } from '@angular/router';
import { Test } from './components/widgets/test/test';
import {ShopViewComponent} from './views/shop-view/shop-view.component';

export const routes: Routes = [
  // Redirection automatique : quand on ouvre l'app, on va directement sur /boutique
  { path: '', redirectTo: 'boutique', pathMatch: 'full' },

  // La route qui affiche la page
  { path: 'boutique', component: ShopViewComponent },

  //  ancienne route de test
  { path: 'test', component: Test }
];
