import {Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CustomCheckbox} from '../../components/inputs/custom-checkbox/custom-checkbox';
import {ImportedShopEntry, ShopSelectionStore} from '../../stores/shop-selection.store';
import {SHOP_ATTRIBUTE_LABELS, ShopAttribute} from '../../models/shop-attribute.model';

@Component({
  selector: 'app-selected-view',
  standalone: true,
  imports: [CommonModule, CustomCheckbox],
  templateUrl: './selected-view.html',
  styleUrl: './selected-view.css',
})
export class SelectedView {
  readonly store = inject(ShopSelectionStore);
  readonly attributeLabels = SHOP_ATTRIBUTE_LABELS;

  removeEntry(shopId: string): void {
    this.store.removeEntry(shopId);
  }

  onAttributeToggle(entry: ImportedShopEntry, attribute: ShopAttribute): void {
    this.store.toggleAttribute(entry.shop.id, attribute);
  }

  onPhotosToggle(entry: ImportedShopEntry): void {
    this.store.togglePhotos(entry.shop.id);
  }

  onPhotoToggle(entry: ImportedShopEntry, photoId: string): void {
    this.store.togglePhoto(entry.shop.id, photoId);
  }

  isPhotoSelected(entry: ImportedShopEntry, photoId: string): boolean {
    return entry.selectedPhotos.some((p) => p.id === photoId);
  }

  getSubtitleForAttribute(entry: ImportedShopEntry, attribute: string): string {
    const shop = entry.shop;
    switch (attribute) {
      case 'label': return shop.label;
      case 'address': return shop.address.formatted;
      case 'humanUrl': return shop.humanUrl ?? '';
      case 'primaryCategory': return shop.primaryCategory?.label ?? '';
      default: return '';
    }
  }
}