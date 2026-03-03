import { Component, OnInit, inject } from '@angular/core';
import { SearchBar } from './components/inputs/search-bar/search-bar';
import { ShopCard } from './components/shop-card/shop-card';
import { ShopApiService } from './core/http/shop-api.service';
import { Shop, createDefaultShopFilters } from './models/shop.model';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, SearchBar, ShopCard, RouterOutlet],
  templateUrl: './app.html',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly shopApi = inject(ShopApiService);

  shops: Shop[] = [];
  loading = true;
  loadingShopId: string | null = null;
  searchQuery = '';

  ngOnInit(): void {
    document.title = 'Ollca - Génération Contenu';
    this.loadShops();
  }

  loadShops(): void {
    this.loading = true;
    const filters = { ...createDefaultShopFilters(), q: this.searchQuery };

    this.shopApi.search(filters).subscribe({
      next: (result) => {
        this.shops = result.content;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement boutiques:', err);
        this.loading = false;
      }
    });
  }

  onSearch(query: string): void {
    this.searchQuery = query;
    this.loadShops();
  }

  onGenerate(shop: Shop): void {
    console.log('Generate:', shop.label);
    this.loadingShopId = shop.id;
    // TODO: Implement Penpot generation
  }

  onAdd(shop: Shop): void {
    console.log('Add:', shop.label);
    // TODO: Implement add to selection
  }

  protected readonly console = console;
}
