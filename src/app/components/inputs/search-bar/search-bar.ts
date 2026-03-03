import {Component, output, signal} from '@angular/core';
import {NgClass, NgOptimizedImage} from '@angular/common';

const DEFAULT_TIME = 500 // 0.5 second(s)

@Component({
  selector: 'app-search-bar',
  imports: [
    NgOptimizedImage,
    NgClass
  ],
  templateUrl: './search-bar.html',
  styleUrl: './search-bar.css',
})
export class SearchBar {
  inputUpdated = output<string>()
  timerId = 0
  isFocused = signal<boolean>(false)

  onInputUpdate(event: Event) {
    clearTimeout(this.timerId)
    const userInput = (event.target as HTMLInputElement).value
    this.timerId = setTimeout(() => this.inputUpdated.emit(userInput), DEFAULT_TIME)
  }
}
