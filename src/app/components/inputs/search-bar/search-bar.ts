import {Component, output} from '@angular/core';
import {NgOptimizedImage} from '@angular/common';

@Component({
  selector: 'app-search-bar',
  imports: [
    NgOptimizedImage
  ],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.css',
})
export class SearchBar {
  inputUpdated = output<string>()

  onInputUpdate(event: Event) {
    const data = (event.target as HTMLInputElement).value
    console.log(data)
    this.inputUpdated.emit(data)
  }
}
