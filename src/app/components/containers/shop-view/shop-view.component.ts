import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent, NavItem } from '../navbar/navbar';
import { SearchBar } from '../../inputs/search-bar/search-bar';
import { DropDownComponent, DropDownOption } from '../../inputs/drop-down/drop-down';
import { ShopApiService } from '../../../core/http/shop-api.service';
import { ShopCard } from '../../shop-card/shop-card';
import { Shop, ShopFilters } from '../../../models/shop.model';

@Component({
  selector: 'app-shop-view',
  standalone: true,
  imports: [CommonModule, NavbarComponent, SearchBar, DropDownComponent, ShopCard],
  templateUrl: './shop-view.component.html',
  styleUrl: './shop-view.component.css'
})
export class ShopViewComponent implements OnInit {
  private readonly shopApi = inject(ShopApiService);

  navTabs: NavItem[] = [
    { label: 'Boutique', route: '/boutique' },
    { label: 'Produit', route: '/produit' },
    { label: 'Codes promotionnels', route: '/promo' }
  ];

  categoryOptions: DropDownOption[] = [];
  marketplaceOptions: DropDownOption[] = [
    { key: 'all', value: 'Marketplace' },
    { key: 'rouen', value: 'Rouen Local' }
  ];

  shops: Shop[] = [];
  loading = true;
  loadingMore = false;
  searchQuery = '';

  // Scroll infini
  currentPage = 1;
  pageSize = 20;
  hasMore = true;

  ngOnInit(): void {
    this.loadCategories();
    this.loadShops();
  }

  onScroll(event: Event): void {
    if (this.loadingMore || !this.hasMore) return;

    const element = event.target as HTMLElement;
    const scrollPosition = element.scrollTop + element.clientHeight;
    const threshold = element.scrollHeight - 100;

    if (scrollPosition >= threshold) {
      this.loadMore();
    }
  }

  private loadCategories(): void {
    this.shopApi.getCategories().subscribe({
      next: (categories) => {
        this.categoryOptions = categories.map(cat => ({
          key: cat.id,
          value: cat.label
        }));
      },
      error: (err) => console.error('Erreur chargement catégories:', err)
    });
  }

  /**
   * Charge les boutiques via l'API avec tri par date de création décroissante
   * et score de pertinence si recherche (DAT30_F1_US2)
   */
  private loadShops(): void {
    this.loading = true;
    this.currentPage = 1;
    this.hasMore = true;

    const filters: ShopFilters = {
      page: this.currentPage,
      size: this.pageSize,
      q: this.searchQuery || undefined,
      sort: this.searchQuery ? ['-score', '-creationDate'] : ['-creationDate']
    };

    this.shopApi.search(filters).subscribe({
      next: (result) => {
        this.shops = result.content;
        this.hasMore = !result.last;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement boutiques:', err);
        this.loading = false;
      }
    });
  }

  private loadMore(): void {
    if (this.loadingMore || !this.hasMore) return;

    this.loadingMore = true;
    this.currentPage++;

    const filters: ShopFilters = {
      page: this.currentPage,
      size: this.pageSize,
      q: this.searchQuery || undefined,
      sort: this.searchQuery ? ['-score', '-creationDate'] : ['-creationDate']
    };

    this.shopApi.search(filters).subscribe({
      next: (result) => {
        this.shops = [...this.shops, ...result.content];
        this.hasMore = !result.last;
        this.loadingMore = false;
      },
      error: (err) => {
        console.error('Erreur chargement boutiques:', err);
        this.loadingMore = false;
      }
    });
  }

  // --- Écouteurs d'événements ---

  onSelectedClick(label: string): void {
    console.log('Onglet droit cliqué :', label);
  }

  onSearchUpdate(searchTerm: string): void {
    this.searchQuery = searchTerm;
    this.loadShops();
  }

  onCategorySelect(categoryId: string | number): void {
    console.log('Catégorie sélectionnée :', categoryId);
  }

  onMarketplaceSelect(marketplaceId: string | number): void {
    console.log('Marketplace sélectionnée :', marketplaceId);
  }

  onGenerate(shop: Shop): void {
    console.log('Générer pour :', shop.label);
  }

  onAdd(shop: Shop): void {
    console.log('Ajouter :', shop.label);
  }
}
