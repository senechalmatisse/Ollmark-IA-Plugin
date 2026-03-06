import {Component, inject, OnInit} from '@angular/core';
import {NavbarComponent} from './components/containers/navbar/navbar';
import {Tab} from './components/inputs/tab/tab';
import {Router, RouterOutlet} from '@angular/router';
import {ToastComponent} from './components/widgets/toast/toast.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [NavbarComponent, Tab, RouterOutlet, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})

export class App implements OnInit {
  router = inject(Router)

  ngOnInit(): void {
    document.title = 'Ollca - Génération Contenu';
  }

  protected async onSelectedClick(s: string) {
    await this.router.navigate([s])
  }
}
