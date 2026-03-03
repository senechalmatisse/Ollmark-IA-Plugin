import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Shop } from '../../models/shop.model';

@Component({
  selector: 'app-shop-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shop-card.html',
  styleUrl: './shop-card.css',
})
export class ShopCard {
  private _shop!: Shop;
  private _imageUrlOverride: string | null = null;
  private readonly placeholderUrl = 'data:image/svg+xml,' + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200">
      <rect fill="#f0f0f0" width="300" height="200"/>
      <text fill="#999" font-family="Arial, sans-serif" font-size="14" text-anchor="middle" x="150" y="100">Image non disponible</text>
    </svg>
  `.trim());

  @Input({ required: true })
  set shop(value: Shop) {
    this._shop = value;
    this._imageUrlOverride = null; // Reset override when shop changes
  }
  get shop(): Shop {
    return this._shop;
  }

  @Input() loading = false;

  @Output() generate = new EventEmitter<Shop>();
  @Output() add = new EventEmitter<Shop>();

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
