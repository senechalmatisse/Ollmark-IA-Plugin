import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CdkFixedSizeVirtualScroll, CdkVirtualForOf, CdkVirtualScrollViewport} from '@angular/cdk/scrolling';
import {SearchBar} from '../../components/inputs/search-bar/search-bar';
import {DropDownComponent, DropDownOption} from '../../components/inputs/drop-down/drop-down';
import {ShopApiService} from '../../core/http/shop-api.service';
import {ShopCard} from '../../components/widgets/shop-card/shop-card';
import {Shop, ShopFilters} from '../../models/shop.model';
import {ShopFieldSelector} from '../../components/modals/shop-field-selector/shop-field-selector';
import {ShopSelectionService} from '../../services/shop-selection/shop-selection.service';

import {ShopSelectionStore} from '../../stores/shop-selection.store';


@Component({
  selector: 'app-shop-view',
  standalone: true,
  imports: [CommonModule, CdkVirtualScrollViewport, CdkFixedSizeVirtualScroll, CdkVirtualForOf, SearchBar, DropDownComponent, ShopCard, ShopFieldSelector],
  templateUrl: './shop-view.component.html',
  styleUrl: './shop-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShopViewComponent implements OnInit {
  private readonly shopApi = inject(ShopApiService);
  private readonly selectionService = inject(ShopSelectionService);
  private readonly shopStore = inject(ShopSelectionStore);
  private readonly cdr = inject(ChangeDetectorRef);

  categoryOptions: DropDownOption[] = [];
  marketplaceOptions: DropDownOption[] = [];

  shops: Shop[] = [];
  shopRows: Shop[][] = [];
  loading = true;
  loadingMore = false;
  searchQuery = '';

  currentPage = 1;
  pageSize = 20;
  hasMore = true;

  private lastScrollTime = 0;
  private readonly scrollThrottleMs = 100;

  // Height of each row (shop-card height + gap)
  readonly rowHeight = 156;

  selectedCategoryId?: string;
  selectedCatalogId?: string;

  selectedShop: Shop | null = null;
  selectedMode: 'select' | 'quick' = 'select';
  showModal = false;

  ngOnInit(): void {
    this.loadCategories();
    this.loadMarketplaces();
    this.loadShops();
  }

  /** Groups shops into rows of 2 for the virtual scroll grid */
  private groupIntoRows(shops: Shop[]): Shop[][] {
    const rows: Shop[][] = [];
    for (let i = 0; i < shops.length; i += 2) {
      rows.push(shops.slice(i, i + 2));
    }
    return rows;
  }

  /** TrackBy function for virtual scroll rows */
  trackRow(index: number, row: Shop[]): string {
    return row.map(s => s.id).join('-');
  }

  /** Called when virtual scroll index changes - triggers load more near the end */
  onVirtualScroll(index: number): void {
    const now = Date.now();
    if (now - this.lastScrollTime < this.scrollThrottleMs) return;
    this.lastScrollTime = now;

    if (this.loadingMore || !this.hasMore) return;

    // Load more when we're within 3 rows of the end
    const visibleRows = 6;
    if (index + visibleRows >= this.shopRows.length - 2) {
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
          {key: '', value: 'Toutes les catégories'},
          ...apiOptions
        ];
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Erreur chargement catégories:', err)
    });
  }

  private loadMarketplaces(): void {
    this.shopApi.getMarketplaces().subscribe({
      next: (marketplaces) => {
        const apiOptions: DropDownOption[] = [];

        marketplaces.forEach(m => {
          if (m.shopCatalogs && m.shopCatalogs.length > 0) {

            m.shopCatalogs.forEach(catalog => {
              apiOptions.push({
                key: catalog.id,

                value: m.shopCatalogs.length > 1 ? `${m.label} - ${catalog.label}` : m.label
              });
            });

          }
        });

        this.marketplaceOptions = [
          {key: '', value: 'Toutes les marketplaces'},
          ...apiOptions
        ];
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Erreur chargement marketplaces:', err)
    });
  }

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

    this.shopApi.search(filters).subscribe({
      next: (result) => {
        this.shops = result.content;
        this.shopRows = this.groupIntoRows(this.shops);
        this.hasMore = !result.last;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
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
        this.shopRows = this.groupIntoRows(this.shops);
        this.hasMore = !result.last;
        this.loadingMore = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingMore = false;
        this.cdr.markForCheck();
      }
    });
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
    this.selectedShop = shop;
    this.selectedMode = 'quick';
    this.showModal = true;
  }

  onAdd(shop: Shop): void {
    this.selectedShop = shop;
    this.selectedMode = 'select';
    this.showModal = true;
  }

  onModalClose(): void {
    this.showModal = false;
    this.selectedShop = null;
  }

  onModalConfirm(): void {
    this.showModal = false;
    this.selectedShop = null;
  }
}
