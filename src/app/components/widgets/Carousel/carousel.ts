import {Component, input, output} from '@angular/core';
import {CommonModule} from '@angular/common';

export interface CarouselItem {
  id: string;
  imageUrl: string;
}

@Component({
  selector: 'app-carousel',
  imports: [CommonModule],
  templateUrl: './carousel.html',
  styleUrl: './carousel.css',
})
export class Carousel {
  items = input<CarouselItem[]>([]);
  visibleCount = input<number>(4);
  selectedIds = input<ReadonlySet<string>>(new Set());

  itemSelected = output<CarouselItem>();
  slideChanged = output<number>();

  currentIndex = 0;
  selectedIndex = 0;
  readonly itemWidth = 64;

  get maxIndex(): number {
    return Math.max(0, this.items().length - this.visibleCount());
  }

  onPrev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.slideChanged.emit(this.currentIndex);
    }
  }

  onNext() {
    if (this.currentIndex < this.maxIndex) {
      this.currentIndex++;
      this.slideChanged.emit(this.currentIndex);
    }
  }

  onSelectItem(index: number) {
    this.selectedIndex = index;
    this.itemSelected.emit(this.items()[index]);
  }
}