import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-button',
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css',
})
export class ButtonComponent {
  @Input() width: string | number = 'auto';
  @Input() height: string | number = 'auto';
  @Input() paddingXY: [number | string, number | string] = [0, 0];
  @Input() text: string = '';
  @Input() icon: string = '';
  @Input() iconPath: string = '';
  @Input() rounded: boolean = false;
  @Input() backgroundColor: string = '#000000';
  @Input() textColor: string = '#f2ebeb';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;
  @Input() customClass: string = '';
  @Output() onClick = new EventEmitter<Event>();

  get buttonStyles() {
    return {
      'width': typeof this.width === 'number' ? `${this.width}px` : this.width,
      'height': typeof this.height === 'number' ? `${this.height}px` : this.height,
      'padding': Array.isArray(this.paddingXY)
        ? `${this.paddingXY[0]}px ${this.paddingXY[1]}px`
        : this.paddingXY,
      'background-color': this.backgroundColor,
      'color': this.textColor,
      'border-radius': this.rounded ? '25px' : '16px',
      'disabled': this.disabled ? 'true' : 'false',
      'cursor': this.disabled ? 'not-allowed' : 'pointer'
    };
  }

  handleClick(event: Event) {
    if (!this.disabled) {
      this.onClick.emit(event);
    }
  }
}
