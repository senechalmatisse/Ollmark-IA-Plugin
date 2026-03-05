import {Injectable, signal, computed} from '@angular/core';
import {ShopAttribute} from '../models/shop-attribute.model';
import {Shop, ShopMedia} from '../models/shop.model';

export interface ImportedShopEntry {
  shop: Shop;
  selectedAttributes: ShopAttribute[];
  selectedPhotos: ShopMedia[];
}

@Injectable({
  providedIn: 'root',
})
export class ShopSelectionStore {
  private readonly _entries = signal<ImportedShopEntry[]>([]);

  readonly entries = computed(() => this._entries());
  readonly count = computed(() => this._entries().length);
  readonly hasEntries = computed(() => this._entries().length > 0);

  addEntry(shop: Shop, selectedAttributes: ShopAttribute[], selectedPhotos: ShopMedia[]): void {
    const existing = this._entries().findIndex((e) => e.shop.id === shop.id);
    if (existing >= 0) {
      this._entries.update((entries) =>
        entries.map((e, i) => i === existing ? {shop, selectedAttributes, selectedPhotos} : e)
      );
    } else {
      this._entries.update((entries) => [...entries, {shop, selectedAttributes, selectedPhotos}]);
    }
  }

  removeEntry(shopId: string): void {
    this._entries.update((entries) => entries.filter((e) => e.shop.id !== shopId));
  }

  toggleAttribute(shopId: string, attribute: ShopAttribute): void {
    this._entries.update((entries) =>
      entries.map((e) => {
        if (e.shop.id !== shopId) return e;
        const has = e.selectedAttributes.includes(attribute);
        return {
          ...e,
          selectedAttributes: has
            ? e.selectedAttributes.filter((a) => a !== attribute)
            : [...e.selectedAttributes, attribute],
        };
      })
    );
  }

  togglePhotos(shopId: string): void {
    this._entries.update((entries) =>
      entries.map((e) => {
        if (e.shop.id !== shopId) return e;
        return {
          ...e,
          selectedPhotos: e.selectedPhotos.length > 0 ? [] : e.shop.photos,
        };
      })
    );
  }

  togglePhoto(shopId: string, photoId: string): void {
    this._entries.update((entries) =>
      entries.map((e) => {
        if (e.shop.id !== shopId) return e;
        const exists = e.selectedPhotos.some((p) => p.id === photoId);
        return {
          ...e,
          selectedPhotos: exists
            ? e.selectedPhotos.filter((p) => p.id !== photoId)
            : [...e.selectedPhotos, e.shop.photos.find((p) => p.id === photoId)!],
        };
      })
    );
  }

  clearEntries(): void {
    this._entries.set([]);
  }
}