import {Injectable, inject} from '@angular/core';
import {Shop} from '../../models/shop.model';
import {ShopAttribute} from '../../models/shop-attribute.model';
import {ContentSelectionStore} from '../../stores/content-selection.store';
import {ShopSelectionStore} from '../../stores/shop-selection.store';
import { ToastService } from '../toast/toast.service';
@Injectable({
  providedIn: 'root',
})
export class ShopSelectionService {
  private readonly contentStore = inject(ContentSelectionStore);
  private readonly shopStore = inject(ShopSelectionStore);
  private readonly toastService = inject(ToastService);
  importSelectedFields(shop: Shop): void {
    const attributes = Array.from(this.contentStore.selectedAttributes())
      .filter((a) => a !== 'photos');
    const photoIds = this.contentStore.selectedPhotoIds();

    const selectedPhotos = shop.photos.filter((photo) => photoIds.has(photo.id));

    this.shopStore.addEntry(shop, attributes, selectedPhotos);
    
    this.contentStore.clearSelection();
  }

  quickImport(shop: Shop): void {
    this.toastService.showWait();
    const attributes = Array.from(this.contentStore.selectedAttributes()).filter(a => a !== 'photos');
    const photoIds = this.contentStore.selectedPhotoIds();
    const selectedPhotos = shop.photos.filter(photo => photoIds.has(photo.id));

    
    const exportData = {
      shopLabel: attributes.includes('label') ? shop.label : null,
      address: attributes.includes('address') ? shop.address.formatted : null,
      url: attributes.includes('humanUrl') ? shop.humanUrl : null,
      category: attributes.includes('primaryCategory') ? shop.primaryCategory?.label : null,
      photos: selectedPhotos.map(p => p.url)
    };

    
    parent.postMessage({
      type: 'quick-import-direct',
      data: exportData
    }, '*');
    
    setTimeout(() => {
      this.toastService.showSuccess();
      this.contentStore.clearSelection();
    }, 300);
    
    console.log('Message envoyé directement à Penpot', exportData);
    
    
    this.contentStore.clearSelection();
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