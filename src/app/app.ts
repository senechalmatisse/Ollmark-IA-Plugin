import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { ShopViewComponent } from './components/containers/ShopViewComponent/shop-view.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ShopViewComponent],
  templateUrl: './app.html',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './app.css'
})
export class App implements OnInit {
  ngOnInit(): void {
    document.title = 'Ollca - Génération Contenu';
  }
}
