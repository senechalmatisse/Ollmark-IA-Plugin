import {Injectable, inject} from '@angular/core';
import {Shop} from '../../models/shop.model';
import {ShopAttribute} from '../../models/shop-attribute.model';
import {ContentSelectionStore} from '../../stores/content-selection.store';
import {ShopSelectionStore} from '../../stores/shop-selection.store';

@Injectable({
  providedIn: 'root',
})
export class ShopSelectionService {
  private readonly contentStore = inject(ContentSelectionStore);
  private readonly shopStore = inject(ShopSelectionStore);

  importSelectedFields(shop: Shop): void {
    const attributes = Array.from(this.contentStore.selectedAttributes())
      .filter((a) => a !== 'photos');
    const photoIds = this.contentStore.selectedPhotoIds();

    const selectedPhotos = shop.photos.filter((photo) => photoIds.has(photo.id));

    this.shopStore.addEntry(shop, attributes, selectedPhotos);
    
    this.contentStore.clearSelection();
  }

  quickImport(shop: Shop): void {
    const textFields: ShopAttribute[] = ['label', 'address', 'humanUrl', 'primaryCategory'];
    const selectedPhotos = shop.photos;

    this.shopStore.addEntry(shop, textFields, selectedPhotos);
  }

  private resolveAttributeText(shop: Shop, attribute: ShopAttribute): string | null {
    switch (attribute) {
      case 'label': return shop.label;
      case 'address': return shop.address.formatted;
      case 'humanUrl': return shop.humanUrl;
      case 'primaryCategory': return shop.primaryCategory?.label ?? null;
      default: return null;
    }
  }
}