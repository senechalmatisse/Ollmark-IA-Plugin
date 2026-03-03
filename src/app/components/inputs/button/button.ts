import {Component, input, output} from '@angular/core';
import {ButtonType} from '../../../models/ButtonType';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-button',
  imports: [
    NgClass
  ],
  templateUrl: './button.html',
  styleUrl: './button.css',
})
export class Button {
  buttonClicked = output<void>()
  buttonText = input.required<string>()
  buttonType = input.required<ButtonType>()
  protected readonly ButtonType = ButtonType;
}
