import {Component, Input, input, output} from '@angular/core';
import {ButtonType} from '../../../models/ButtonType';

@Component({
  selector: 'app-button',
  templateUrl: './button.html',
  styleUrl: './button.scss',
})
export class Button {
  buttonClicked = output<void>()
  buttonText = input.required<string>()
  buttonType = input.required<ButtonType>()
  protected readonly ButtonType = ButtonType;
  disabled = input<boolean>(false)
}
