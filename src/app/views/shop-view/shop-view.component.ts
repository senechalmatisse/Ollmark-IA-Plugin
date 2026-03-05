import {Component, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NavbarComponent} from '../../components/containers/navbar/navbar';
import {SearchBar} from '../../components/inputs/search-bar/search-bar';
import {DropDownComponent, DropDownOption} from '../../components/inputs/drop-down/drop-down';
import {ShopApiService} from '../../core/http/shop-api.service';
import {ShopCard} from '../../components/shop-card/shop-card';
import {Shop, ShopFilters} from '../../models/shop.model';
import {Tab} from '../../components/inputs/tab/tab';

@Component({
  selector: 'app-shop-view',
  standalone: true,
  imports: [CommonModule, NavbarComponent, SearchBar, DropDownComponent, ShopCard, Tab],
  templateUrl: './shop-view.component.html',
  styleUrl: './shop-view.component.css'
})
export class ShopViewComponent implements OnInit {
  private readonly shopApi = inject(ShopApiService);

  categoryOptions: DropDownOption[] = [];
  marketplaceOptions: DropDownOption[] = [];

  shops: Shop[] = [];
  loading = true;
  loadingMore = false;
  searchQuery = '';

  // Scroll infini
  currentPage = 1;
  pageSize = 20;
  hasMore = true;

  selectedCategoryId?: string;
  selectedCatalogId?: string;

  ngOnInit(): void {
    this.loadCategories();
    this.loadMarketplaces();
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
        const apiOptions = categories.map(cat => ({
          key: cat.id,
          value: cat.label
        }));
        
        this.categoryOptions = [
          { key: '', value: 'Toutes les catégories' },
          ...apiOptions
        ];
      },
      error: (err) => console.error('Erreur chargement catégories:', err)
    });
  }
  private loadMarketplaces(): void {
    this.shopApi.getMarketplaces().subscribe({
      next: (marketplaces) => {
        const apiOptions: DropDownOption[] = [];

        // On parcourt le tableau des marketplaces
        marketplaces.forEach(m => {
          if (m.shopCatalogs && m.shopCatalogs.length > 0) {
            
            // On parcourt le tableau des catalogues pour CHAQUE marketplace
            m.shopCatalogs.forEach(catalog => {
              apiOptions.push({
                key: catalog.id, // On donne l'ID unique de ce catalogue
                
                // Si la ville a plusieurs catalogues (ex: Paris), on précise le nom
                // Sinon (ex: Rouen), on affiche juste le nom de la ville
                value: m.shopCatalogs.length > 1 ? `${m.label} - ${catalog.label}` : m.label
              });
            });

          }
        });

        this.marketplaceOptions = [
          { key: '', value: 'Toutes les marketplaces' },
          ...apiOptions
        ];
      },
      error: (err) => console.error('Erreur chargement marketplaces:', err)
    });
  }

  /**
   * Charge les boutiques via l'API avec tri par date de création décroissante
   * et score de pertinence si recherche
   */
  private loadShops(): void {
    console.log('1. loadShops() a bien démarré');
    this.loading = true;
    this.currentPage = 1;
    this.hasMore = true;

    const filters: ShopFilters = {
      page: this.currentPage,
      size: this.pageSize,
      q: this.searchQuery || undefined,
      sort: this.searchQuery ? ['-score', '-creationDate'] : ['-creationDate'],
      category: this.selectedCategoryId ? [this.selectedCategoryId] : undefined,
      catalog: this.selectedCatalogId ? this.selectedCatalogId : undefined
    };
     console.log('2. Filtres préparés pour le service :', filters);

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
      sort: this.searchQuery ? ['-score', '-creationDate'] : ['-creationDate'],
      category: this.selectedCategoryId ? [this.selectedCategoryId] : undefined,
      catalog: this.selectedCatalogId ? this.selectedCatalogId : undefined
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
    this.selectedCategoryId = categoryId ? categoryId.toString() : undefined;
    this.loadShops();
  }

  onMarketplaceSelect(marketplaceId: string | number): void {
    console.log('Marketplace sélectionnée :', marketplaceId);
    this.selectedCatalogId = marketplaceId ? marketplaceId.toString() : undefined;
    this.loadShops();
  }

  onGenerate(shop: Shop): void {
    console.log('Générer pour :', shop.label);
  }

  onAdd(shop: Shop): void {
    console.log('Ajouter :', shop.label);
  }
}