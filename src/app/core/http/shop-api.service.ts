import { Injectable, inject, InjectionToken } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Shop, ShopFilters, ShopCategory, CategoryFilters, Marketplace } from '../../models/shop.model';
import { Paginated } from '../../models/pagination.model';
import { mapShopFromDto, mapCategoryFromDto, GeoLocatedShopDto, CategoryDto } from './shop.mapper';

interface PaginatedApiResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  last: boolean;
}

export interface IShopRepository {
  search(filters: ShopFilters): Observable<Paginated<Shop>>;
  getCategories(): Observable<ShopCategory[]>;
  searchCategories(filters: CategoryFilters): Observable<Paginated<ShopCategory>>;
  getMarketplaces(): Observable<Marketplace[]>;
}

export const SHOP_REPOSITORY = new InjectionToken<IShopRepository>('IShopRepository');

@Injectable({
  providedIn: 'root'
})
export class ShopApiService implements IShopRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/shop-api/v2/public';
  private readonly marketplaceBaseUrl = '/marketplace-api/v2/public';

  /**
   * Recherche paginée des boutiques - GET /v2/public/shop
   */
  search(filters: ShopFilters): Observable<Paginated<Shop>> {
    console.log('3. Le service a bien reçu la commande avec :', filters);
    let params = new HttpParams()
      .set('page', (filters.page).toString())
      .set('size', filters.size.toString());

    if (filters.q) {
      params = params.set('q', filters.q);
    }

    if (filters.sort?.length) {
      for (const sortField of filters.sort) {
        params = params.append('sort', sortField);
      }
    }

    if (filters.category?.length) {
      params = params.set('category', filters.category.join(','));
    }
    if (filters.catalog) {
      params = params.set('catalog', filters.catalog);
    }

    const sortFields =  ['-creationDate'];
    
    // On ajoute chaque critère de tri à l'URL via la méthode append
    sortFields.forEach(field => {
      params = params.append('sort', field);
    });
    // -------------------------------------------------------
    console.log('URL finale générée par Angular :', params.toString());
    return this.http.get<PaginatedApiResponse<GeoLocatedShopDto>>(`${this.baseUrl}/shop`, { params }).pipe(
      map(response => ({
        content: (response.content || []).map((item: GeoLocatedShopDto) => mapShopFromDto(item)),
        totalElements: response.totalElements || 0,
        totalPages: response.totalPages || 0,
        size: response.size,
        number: (response.number || 0) + 1,
        last: response.last ?? true
      }))
    );
  }

  /**
   * Récupère les catégories - GET /v2/public/category
   */
  getCategories(): Observable<ShopCategory[]> {
    const params = new HttpParams().set('size', '1000');

    return this.http.get<PaginatedApiResponse<CategoryDto>>(`${this.baseUrl}/category`, { params }).pipe(
      map(response => {
        const content = response.content || [];
        return content.map((dto: CategoryDto) => mapCategoryFromDto(dto));
      })
    );
  }

  /**
   * Recherche paginée des catégories
   */
  searchCategories(filters: CategoryFilters): Observable<Paginated<ShopCategory>> {
    let params = new HttpParams()
      .set('page', filters.page.toString())
      .set('size', filters.size.toString());

    if (filters.q) {
      params = params.set('q', filters.q);
    }

    return this.http.get<PaginatedApiResponse<CategoryDto>>(`${this.baseUrl}/category`, { params }).pipe(
      map(response => ({
        content: (response.content || []).map((dto: CategoryDto) => mapCategoryFromDto(dto)),
        totalElements: response.totalElements || 0,
        totalPages: response.totalPages || 0,
        size: response.size,
        number: response.number || 0,
        last: response.last ?? true
      }))
    );
  }
  getMarketplaces(): Observable<Marketplace[]> {
    const params = new HttpParams()
      .set('page', '1')
      .set('size', '1000');

    return this.http.get<PaginatedApiResponse<Marketplace>>(`${this.marketplaceBaseUrl}/marketplace`, { params }).pipe(
      map(response => response.content || [])
    );
  }
}
