import {Component} from '@angular/core';
import {SearchBar} from '../../../features/OLM-1102/ui/search-bar/search-bar';

@Component({
  selector: 'app-test',
  standalone: true,
  imports: [
    SearchBar
  ],
  templateUrl: './test.html',
  styleUrl: './test.css',
})
export class Test {
}
