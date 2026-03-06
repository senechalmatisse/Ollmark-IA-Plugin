import {Component, input, output} from '@angular/core';
import {CommonModule} from '@angular/common';

/**  OLM-1103 dropdown (clé/valeur)
 *
 */
export interface DropDownOption {
  key: string | number;
  value: string;
}

@Component({
  selector: 'app-drop-down',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './drop-down.html',
  styleUrl: './drop-down.scss'
})
export class DropDownComponent {
  label = input<string>("")
  options = input<DropDownOption[]>([])
  showPlaceholder = input<boolean>(true);

  selectionChange = output<string | number>();

  onSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectionChange.emit(target.value);
  }
}
