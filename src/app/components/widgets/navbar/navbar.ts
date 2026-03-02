import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface NavItem {
  label: string;
  route: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent {
  tabs = input<NavItem[]>([]); 
  rightButtonLabel = input<string>(); 
  selectedClick = output<string>();

  clickOnSelected(): void {
    const label = this.rightButtonLabel();
    if (label) {
      this.selectedClick.emit(label);
    }
  }
}