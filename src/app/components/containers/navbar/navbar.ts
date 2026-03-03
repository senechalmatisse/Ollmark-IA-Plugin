import {Component, EventEmitter, Input, Output, ViewEncapsulation} from '@angular/core';
import {CommonModule} from '@angular/common';

export interface NavItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.html',
  encapsulation: ViewEncapsulation.None,
  styleUrl: './navbar.css'
})
export class NavbarComponent {
  @Input() tabs: NavItem[] = [];
  @Input() rightButtonLabel = '';
  @Output() selectedClick = new EventEmitter<string>();

  onRightButtonClick(): void {
    this.selectedClick.emit(this.rightButtonLabel);
  }
}
