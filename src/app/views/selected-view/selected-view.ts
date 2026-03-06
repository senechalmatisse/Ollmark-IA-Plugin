import {Component, inject, output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {CustomCheckbox} from '../../components/inputs/custom-checkbox/custom-checkbox';
import {ImportedShopEntry, ShopSelectionStore} from '../../stores/shop-selection.store';
import {SHOP_ATTRIBUTE_LABELS, ShopAttribute} from '../../models/shop-attribute.model';
import { PENPOT_SERVICE } from '../../core/penpot/penpot.service';
import { Shop } from '../../models/shop.model';
import { ToastService } from '../../services/toast/toast.service';
import {Card} from '../../components/containers/card/card';
import {Button} from '../../components/inputs/button/button';
import {ButtonType} from '../../models/ButtonType';

@Component({
  selector: 'app-selected-view',
  standalone: true,
  imports: [CommonModule, CustomCheckbox, Card, Button],
  templateUrl: './selected-view.html',
  styleUrl: './selected-view.scss',
})
export class SelectedView {
  readonly store = inject(ShopSelectionStore);
  readonly attributeLabels = SHOP_ATTRIBUTE_LABELS;
  private readonly penpotService = inject(PENPOT_SERVICE);

  private readonly toastService = inject(ToastService);
  editEntry = output<Shop>();

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


  onGenerateAll(): void {
    const entries = this.store.entries();
    if (entries.length === 0) return;
    this.toastService.showWait();
    entries.forEach(entry => {

      entry.selectedAttributes.forEach(attr => {
        const textValue = this.getSubtitleForAttribute(entry, attr);
        if (textValue) {
          this.penpotService.createText(`${this.attributeLabels[attr]} : ${textValue}`);
        }
      });


      entry.selectedPhotos.forEach(photo => {
        this.penpotService.createImage(photo.url);
      });
    });

    setTimeout(() => {
      this.toastService.showSuccess();
      this.store.clearEntries();
    }, 300);
    this.penpotService.notify('Génération de la sélection terminée avec succès !');


    this.store.clearEntries();
  }
  onEditClick(shop: Shop): void {
    console.log('CLIC CAPTÉ DANS ENFANT (SelectedView) POUR :', shop.label);
    this.editEntry.emit(shop);
  }

  protected readonly ButtonType = ButtonType;
}
