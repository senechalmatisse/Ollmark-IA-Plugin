import {Routes} from '@angular/router';
import {Test} from './components/widgets/test/test';
import {ShopViewComponent} from './views/shop-view/shop-view.component';
import {SelectedView} from './views/selected-view/selected-view';

export const routes: Routes = [
  {path: '', redirectTo: 'shops', pathMatch: 'full'},
  {path: 'shops', component: ShopViewComponent},
  {path: 'products', component: Test}, // TODO
  {path: 'codes', component: Test}, // TODO
  {path: 'selected', component: SelectedView}
];
