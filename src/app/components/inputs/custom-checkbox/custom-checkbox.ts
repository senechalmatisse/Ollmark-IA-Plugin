import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgIf } from '@angular/common';

@Component({
  selector: 'app-custom-checkbox',
  standalone: true,
  imports: [NgIf],
  templateUrl: './custom-checkbox.html',
  styleUrls: ['./custom-checkbox.css']
})
export class CustomCheckbox {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() checked = false;
  
  @Output() checkedChange = new EventEmitter<boolean>();
  inputId = `checkbox-${Math.random().toString(36).substring(2, 9)}`;

  // Méthode appelée quand l'utilisateur clique sur la checkbox
  onToggle(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    this.checkedChange.emit(inputElement.checked);
  }
}