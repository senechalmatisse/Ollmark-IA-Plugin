import {Component, input, output, inject, OnInit} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CustomCheckbox} from '../../inputs/custom-checkbox/custom-checkbox';
import {Carousel, CarouselItem} from '../../widgets/Carousel/carousel';
import {Shop} from '../../../models/shop.model';
import {ContentSelectionStore} from '../../../stores/content-selection.store';
import {ShopSelectionService} from '../../../services/shop-selection/shop-selection.service';
import {SHOP_ATTRIBUTE_LABELS, SHOP_ATTRIBUTES, ShopAttribute} from '../../../models/shop-attribute.model';
import { PENPOT_SERVICE } from '../../../core/penpot/penpot.service';
import { ShopSelectionStore } from '../../../stores/shop-selection.store';
import {Button} from '../../inputs/button/button';
import {ButtonType} from '../../../models/ButtonType';
import {Popin} from '../../containers/popin/popin';
export type SelectorMode = 'select' | 'quick';

@Component({
  selector: 'app-shop-field-selector',
  standalone: true,
  imports: [CommonModule, CustomCheckbox, Carousel, Button, Popin],
  templateUrl: './shop-field-selector.html',
  styleUrl: './shop-field-selector.scss',
})
export class ShopFieldSelector implements OnInit {
  shop = input.required<Shop>();
  mode = input<SelectorMode>('select');

  closed = output<void>();
  confirmed = output<void>();

  readonly store = inject(ContentSelectionStore);
  private readonly selectionService = inject(ShopSelectionService);
  private readonly penpotService = inject(PENPOT_SERVICE);
  readonly shopStore = inject(ShopSelectionStore);
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
    if (this.mode() === 'quick') {

      this.selectionService.quickImport(this.shop());
    } else {

      this.selectionService.importSelectedFields(this.shop());
    }

    this.confirmed.emit();
  }

  onClose(): void {
    this.store.clearSelection();
    this.closed.emit();
  }

  ngOnInit(): void {
    // On s'assure de partir d'un état vierge
    this.store.clearSelection();

    // On cherche si cette boutique est déjà dans le panier
    const existingEntry = this.shopStore.entries().find(e => e.shop.id === this.shop().id);

    if (existingEntry) {
      // 1. On recoche les champs textes
      existingEntry.selectedAttributes.forEach(attr => {
        this.store.toggleAttribute(attr);
      });


      if (existingEntry.selectedPhotos.length > 0) {

        this.store.toggleAttribute('photos');


        existingEntry.selectedPhotos.forEach(photo => {
          this.store.togglePhoto(photo.id);
        });
      }
    }
  }

  protected readonly ButtonType = ButtonType;
}
