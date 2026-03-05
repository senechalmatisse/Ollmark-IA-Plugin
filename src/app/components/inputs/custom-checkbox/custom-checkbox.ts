import {Component, input, output} from '@angular/core';

@Component({
  selector: 'app-custom-checkbox',
  standalone: true,
  templateUrl: './custom-checkbox.html',
  styleUrls: ['./custom-checkbox.css']
})
export class CustomCheckbox {
  private static counter = 0;
  private readonly _id = CustomCheckbox.counter++;

  title = input<string>('');
  subtitle = input<string>('');
  checked = input<boolean>(false);
  checkedChange = output<boolean>();

  get inputId(): string {
    return `checkbox-${this.slugify(this.title())}-${this.slugify(this.subtitle())}-${this._id}`;
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replaceAll(/[\u0300-\u036f]/g, '')
      .replaceAll(/\s+/g, '-')
      .replaceAll(/[^a-z0-9-]/g, '')
      .slice(0, 30);
  }

  onToggle(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.checkedChange.emit(inputElement.checked);
  }
}