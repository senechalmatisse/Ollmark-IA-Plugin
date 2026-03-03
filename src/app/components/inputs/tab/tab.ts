import {Component, input, output} from '@angular/core';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-tab',
  imports: [
    NgClass
  ],
  templateUrl: './tab.html',
  styleUrl: './tab.css',
})
export class Tab {
  tabText = input.required<string>()
  isSelected = input<boolean>(false)
  isSpecial = input<boolean>(false)
  tabClicked = output<void>()
}
