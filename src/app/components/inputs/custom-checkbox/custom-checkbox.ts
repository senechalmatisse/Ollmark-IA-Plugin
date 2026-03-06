import {Component, input, output} from '@angular/core';

let globalCheckboxCounter = 0

@Component({
  selector: 'app-custom-checkbox',
  standalone: true,
  templateUrl: './custom-checkbox.html',
  styleUrls: ['./custom-checkbox.scss']
})
export class CustomCheckbox {
  title = input<string>('');
  subtitle = input<string>('');
  checked = input<boolean>(false);
  checkedChange = output<boolean>();

  compId: number

  constructor() {
    this.compId = globalCheckboxCounter
    globalCheckboxCounter = (globalCheckboxCounter + 1) % 9999
  }

  get checkId(): string {
    return `checkbox${this.compId}`;
  }

  // private slugify(text: string): string {
  //   return text
  //     .toLowerCase()
  //     .normalize('NFD')
  //     .replaceAll(/[\u0300-\u036f]/g, '')
  //     .replaceAll(/\s+/g, '-')
  //     .replaceAll(/[^a-z0-9-]/g, '')
  //     .slice(0, 30);
  // }

  onToggle(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.checkedChange.emit(inputElement.checked);
  }
}
