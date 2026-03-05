import {Component, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {NavbarComponent, NavItem} from '../../components/containers/navbar/navbar';
import {SearchBar} from '../../components/inputs/search-bar/search-bar';
import {DropDownComponent, DropDownOption} from '../../components/inputs/drop-down/drop-down';
import {ShopApiService} from '../../core/http/shop-api.service';
import {ShopCard} from '../../components/shop-card/shop-card';
import {Shop, ShopFilters} from '../../models/shop.model';
import {Tab} from '../../components/inputs/tab/tab';
import {ShopFieldSelector} from '../../components/modals/shop-field-selector/shop-field-selector';
import {SelectedView} from '../selected-view/selected-view';
import {ShopSelectionService} from '../../services/shop-selection/shop-selection.service';
import { ToastComponent } from '../../components/toast/toast.component';

import {ShopSelectionStore} from '../../stores/shop-selection.store';


@Component({
  selector: 'app-shop-view',
  standalone: true,
  imports: [CommonModule, NavbarComponent, SearchBar, DropDownComponent, ShopCard, Tab, ShopFieldSelector, SelectedView, ToastComponent],
  templateUrl: './shop-view.component.html',
  styleUrl: './shop-view.component.css'
})
export class ShopViewComponent implements OnInit {
  private readonly shopApi = inject(ShopApiService);
  private readonly selectionService = inject(ShopSelectionService);
  private readonly shopStore = inject(ShopSelectionStore);

  navTabs: NavItem[] = [
    { label: 'Boutique', route: '/boutique' },
    { label: 'Produit', route: '/produit' },
    { label: 'Codes promotionnels', route: '/promo' }
  ];

  categoryOptions: DropDownOption[] = [];
  marketplaceOptions: DropDownOption[] = [];

  shops: Shop[] = [];
  loading = true;
  loadingMore = false;
  searchQuery = '';

  currentPage = 1;
  pageSize = 20;
  hasMore = true;

  selectedCategoryId?: string;
  selectedCatalogId?: string;

  selectedShop: Shop | null = null;
  selectedMode: 'select' | 'quick' = 'select';
  showModal = false;
  showSelected = false;

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
          { key: '', value: 'Toutes les marketplaces' },
          ...apiOptions
        ];
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
        this.hasMore = !result.last;
        this.loading = false;
      },
      error: () => {
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
      error: () => {
        this.loadingMore = false;
      }
    });
  }



  onSelectedClick(label: string): void {
    console.log(label + " not implemented")
    this.showSelected = !this.showSelected;
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

  onEditShop(shop: Shop): void {
    console.log('BOUTON ENGRENAGE CLIQUÉ POUR :', shop.label);
    this.selectedShop = shop;
    this.selectedMode = 'select'; 
    this.showModal = true;
  }

  isShopSelected(shopId: string): boolean {
    return this.shopStore.entries().some((e) => e.shop.id === shopId);
  }
}