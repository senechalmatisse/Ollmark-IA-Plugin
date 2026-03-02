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
  @Input({ required: true }) shop!: Shop;
  @Input() loading = false;

  @Output() generate = new EventEmitter<Shop>();
  @Output() add = new EventEmitter<Shop>();

  onGenerate(event: Event): void {
    event.stopPropagation();
    this.generate.emit(this.shop);
  }

  onAdd(event: Event): void {
    event.stopPropagation();
    this.add.emit(this.shop);
  }
}
