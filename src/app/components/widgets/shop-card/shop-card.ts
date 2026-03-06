import {Component, Input, input, output, ChangeDetectionStrategy} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Shop} from '../../../models/shop.model';

@Component({
  selector: 'app-shop-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shop-card.html',
  styleUrl: './shop-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class ShopCard {
  private _shop!: Shop;
  private _imageUrlOverride: string | null = null;
  private readonly placeholderUrl = "/placeholders/shop.svg"

  @Input({required: true})
  set shop(value: Shop) {
    this._shop = value;
    this._imageUrlOverride = null; // Reset override when shop changes
  }

  get shop() {
    return this._shop
  }

  loading = input<boolean>(false)
  isSelected = input<boolean>(false);
  generate = output<Shop>();
  add = output<Shop>();

  get imageUrl(): string {
    if (this._imageUrlOverride) {
      return this._imageUrlOverride;
    }
    return this._shop?.logo?.url
      || this._shop?.photos?.[0]?.url
      || this.placeholderUrl;
  }

  onImageError(): void {
    this._imageUrlOverride = this.placeholderUrl;
  }

  onGenerate(event: Event): void {
    event.stopPropagation();
    this.generate.emit(this._shop);
  }

  onAdd(event: Event): void {
    event.stopPropagation();
    this.add.emit(this._shop);
  }
}
