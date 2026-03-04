import {Component, input, output} from '@angular/core';

@Component({
  selector: 'app-custom-checkbox',
  standalone: true,
  templateUrl: './custom-checkbox.html',
  styleUrls: ['./custom-checkbox.css']
})
export class CustomCheckbox {
  title = input<string>('');
  subtitle = input<string>('');
  checked = input<boolean>(false);

  checkedChange = output<boolean>();

  inputId = `checkbox-${window.self.crypto.randomUUID()}`;

  onToggle(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.checkedChange.emit(inputElement.checked);
  }
}
