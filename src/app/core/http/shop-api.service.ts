import { Injectable, inject, InjectionToken } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Shop, ShopFilters, ShopCategory, CategoryFilters } from '../../models/shop.model';
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
}

export const SHOP_REPOSITORY = new InjectionToken<IShopRepository>('IShopRepository');

@Injectable({
  providedIn: 'root'
})
export class ShopApiService implements IShopRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/shop-api/v2/public';

  /**
   * Recherche paginée des boutiques - GET /v2/public/shop
   */
  search(filters: ShopFilters): Observable<Paginated<Shop>> {
    let params = new HttpParams()
      .set('page', (filters.page).toString())
      .set('size', filters.size.toString())
      .set('onlineOnly', 'true');

    if (filters.q) {
      params = params.set('q', filters.q);
    }

    if (filters.category?.length) {
      params = params.set('category', filters.category.join(','));
    }

    return this.http.get<PaginatedApiResponse<GeoLocatedShopDto>>(`${this.baseUrl}/shop`, { params }).pipe(
      map(response => ({
        content: response.content.map((item: GeoLocatedShopDto) => mapShopFromDto(item)),
        totalElements: response.totalElements,
        totalPages: response.totalPages,
        size: response.size,
        number: response.number + 1,
        last: response.last
      }))
    );
  }

  /**
   * Récupère les catégories - GET /v2/public/category
   */
  getCategories(): Observable<ShopCategory[]> {
    return this.http.get<PaginatedApiResponse<CategoryDto>>(`${this.baseUrl}/category`).pipe(
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
        content: response.content.map((dto: CategoryDto) => mapCategoryFromDto(dto)),
        totalElements: response.totalElements,
        totalPages: response.totalPages,
        size: response.size,
        number: response.number,
        last: response.last
      }))
    );
  }
}
