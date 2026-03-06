import {Component, input, output} from '@angular/core';

@Component({
  selector: 'app-popin',
  imports: [],
  templateUrl: './popin.html',
  styleUrl: './popin.scss',
})
export class Popin {
  label = input.required<string>()
  closed = output<void>();

  onClose() {
    this.closed.emit()
  }
}
