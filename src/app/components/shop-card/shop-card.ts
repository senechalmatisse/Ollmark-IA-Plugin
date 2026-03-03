import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Shop } from '../../models/shop.model';

@Component({
  selector: 'app-shop-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shop-card.html',
  styleUrl: './shop-card.css',
})
export class ShopCard implements OnInit {
  @Input({ required: true }) shop!: Shop;
  @Input() loading = false;

  @Output() generate = new EventEmitter<Shop>();
  @Output() add = new EventEmitter<Shop>();

  private readonly placeholderUrl = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 300 200"%3E%3Crect fill="%23f0f0f0" width="300" height="200"/%3E%3Ctext fill="%23999" font-family="Arial" font-size="16" text-anchor="middle" x="150" y="105"%3EImage non disponible%3C/text%3E%3C/svg%3E';
  imageUrl = '';

  ngOnInit(): void {
    this.imageUrl = this.shop.logo?.url
      || this.shop.photos?.[0]?.url
      || this.placeholderUrl;
  }

  onImageError(): void {
    this.imageUrl = this.placeholderUrl;
  }

  onGenerate(event: Event): void {
    event.stopPropagation();
    this.generate.emit(this.shop);
  }

  onAdd(event: Event): void {
    event.stopPropagation();
    this.add.emit(this.shop);
  }
}
