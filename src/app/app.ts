import {Component, OnInit} from '@angular/core';
// import { RouterOutlet } from '@angular/router';
import {SearchBar} from './components/inputs/search-bar/search-bar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [SearchBar], // RouterOutlet
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  ngOnInit(): void {
    document.title = "Front"
  }

  protected readonly console = console;
}
