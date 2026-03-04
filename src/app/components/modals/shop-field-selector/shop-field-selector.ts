import {Component, input, output, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CustomCheckbox} from '../../inputs/custom-checkbox/custom-checkbox';
import {Carousel, CarouselItem} from '../../widgets/Carousel/carousel';
import {Shop} from '../../../models/shop.model';
import {ContentSelectionStore} from '../../../stores/content-selection.store';
import {ShopSelectionService} from '../../../services/shop-selection/shop-selection.service';
import {SHOP_ATTRIBUTE_LABELS, SHOP_ATTRIBUTES, ShopAttribute} from '../../../models/shop-attribute.model';

export type SelectorMode = 'select' | 'quick';

@Component({
  selector: 'app-shop-field-selector',
  standalone: true,
  imports: [CommonModule, CustomCheckbox, Carousel],
  templateUrl: './shop-field-selector.html',
  styleUrl: './shop-field-selector.css',
})
export class ShopFieldSelector {
  shop = input.required<Shop>();
  mode = input<SelectorMode>('select');

  closed = output<void>();
  confirmed = output<void>();

  readonly store = inject(ContentSelectionStore);
  private readonly selectionService = inject(ShopSelectionService);

  readonly attributes = SHOP_ATTRIBUTES;
  readonly attributeLabels = SHOP_ATTRIBUTE_LABELS;

  get photoItems(): CarouselItem[] {
    return this.shop().photos.map((p) => ({id: p.id, imageUrl: p.url}));
  }

  getSubtitle(attribute: ShopAttribute): string {
    const shop = this.shop();
    switch (attribute) {
      case 'label': return shop.label;
      case 'address': return shop.address.formatted;
      case 'humanUrl': return shop.humanUrl ?? '';
      case 'primaryCategory': return shop.primaryCategory?.label ?? '';
      default: return '';
    }
  }

  isAttributeSelected(attribute: ShopAttribute): boolean {
    return this.store.isAttributeSelected(attribute);
  }

  isPhotoSelected(photoId: string): boolean {
    return this.store.isPhotoSelected(photoId);
  }

  onAttributeToggle(attribute: ShopAttribute): void {
    this.store.toggleAttribute(attribute);

    if (attribute === 'photos') {
      if (this.store.isAttributeSelected('photos')) {
        // Vient d'être coché → sélectionne toutes les photos
        this.shop().photos.forEach((p) => {
          if (!this.store.isPhotoSelected(p.id)) {
            this.store.togglePhoto(p.id);
          }
        });
      } else {
        // Vient d'être décoché → désélectionne toutes les photos
        this.shop().photos.forEach((p) => {
          if (this.store.isPhotoSelected(p.id)) {
            this.store.togglePhoto(p.id);
          }
        });
      }
    }
  }

  onPhotoToggle(photoId: string): void {
    this.store.togglePhoto(photoId);
  }

  onConfirm(): void {
    this.selectionService.importSelectedFields(this.shop());
    this.confirmed.emit();
  }

  onClose(): void {
    this.store.clearSelection();
    this.closed.emit();
  }
}