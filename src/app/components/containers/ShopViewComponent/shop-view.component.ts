import { Component, OnInit, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent, NavItem } from '../navbar/navbar';
import { SearchBar } from '../../inputs/search-bar/search-bar';
import { DropDownComponent, DropDownOption } from '../../inputs/drop-down/drop-down';
import { ShopApiService } from '../../../core/http/shop-api.service';
import { ShopCard } from '../../shop-card/shop-card';
import { Shop, createDefaultShopFilters } from '../../../models/shop.model';

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
    { key: 'all', value: 'Marketplace' } 
  ];

  shops: Shop[] = [];
  loading = true;
  searchQuery = '';
  currentPage = 1; 
  hasMorePages = true; 

  ngOnInit(): void {
    this.loadCategories();
    this.loadShops(); 
  }

  // On écoute l'événement de défilement de toute la fenêtre
  @HostListener('window:scroll', [])
  onWindowScroll(): void {
    // Calcule la position actuelle du défilement
    const scrollPosition = window.innerHeight + window.scrollY;
    // Calcule la hauteur totale de la page
    const documentHeight = document.documentElement.scrollHeight;

    // Si on arrive à moins de 150 pixels du bas de la page, on charge la suite
    if (scrollPosition >= documentHeight - 150) {
      this.onLoadMore();
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

  private loadShops(isLoadMore = false): void {
    if (!isLoadMore) {
      this.currentPage = 1; 
      this.hasMorePages = true;
    }

    if (!this.hasMorePages || (isLoadMore && this.loading)) return;

    this.loading = true; 
    const filters = { 
      ...createDefaultShopFilters(), 
      page: this.currentPage, 
      q: this.searchQuery 
    };

    this.shopApi.search(filters).subscribe({
      next: (result) => {
        if (isLoadMore) {
          this.shops = [...this.shops, ...result.content];
        } else {
          this.shops = result.content;
        }
        
        this.hasMorePages = this.currentPage < result.totalPages;
        this.loading = false; 
      },
      error: (err) => {
        console.error('Erreur chargement boutiques:', err);
        this.loading = false;
      }
    });
  }

  onLoadMore(): void {
    if (this.hasMorePages && !this.loading) {
      this.currentPage++; 
      this.loadShops(true); 
    }
  }


  onSelectedClick(label: string): void {
    console.log('Onglet droit cliqué :', label);
  }

  onSearchUpdate(searchTerm: string): void {
    console.log('Recherche saisie :', searchTerm);
    this.searchQuery = searchTerm;
    this.loadShops(false); 
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