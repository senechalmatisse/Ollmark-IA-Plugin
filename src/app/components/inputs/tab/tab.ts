import {Component, input, output} from '@angular/core';

@Component({
  selector: 'app-tab',
  templateUrl: './tab.html',
  styleUrl: './tab.scss',
})
export class Tab {
  tabText = input.required<string>()
  isSelected = input<boolean>(false)
  isSpecial = input<boolean>(false)
  tabClicked = output<void>()
}
