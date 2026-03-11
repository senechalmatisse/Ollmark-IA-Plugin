import {
  Component,
  signal,
  inject,
  ElementRef,
  ViewChild,
  NgZone
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../services/chat.service';

/**
 * Composant de saisie du chat.
 * Gère la zone de texte, l'envoi de messages via ChatService,
 * le redimensionnement automatique du textarea et les états UI (focus, chargement).
 */
@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-input.html',
  styleUrls: ['./chat-input.css']
})
export class ChatInput {
   /** Service de chat injecté pour l'envoi des messages */
  private chatService = inject(ChatService);

   /**
   * NgZone injecté pour forcer la détection de changements Angular
   * lors des callbacks asynchrones (subscribe error/complete)
   */
  private ngZone     = inject(NgZone);
  /** Signal contenant la valeur courante du champ de saisie */
  currentValue = signal('');
   /** Signal indiquant si le textarea est actuellement focalisé */
  isFocused    = signal(false);
   /** Signal indiquant si un envoi de message est en cours */
  isLoading    = signal(false);

  /** Référence au textarea du DOM pour manipuler sa hauteur */
  @ViewChild('textarea') textarea!: ElementRef<HTMLTextAreaElement>;

  /**
   * Envoie le message saisi via le ChatService.
   * - Ignore les messages vides ou les doubles envois.
   * - Passe isLoading à true pendant toute la durée de l'appel.
   * - Remet isLoading à false en cas de succès ou d'erreur.
   */
  onSend(): void {
    const message = this.currentValue().trim();

    // Guard : message vide ou envoi déjà en cours
    if (!message || this.isLoading()) return;

    this.isLoading.set(true);
    this.resetInput();

    this.chatService.sendMessage(message).subscribe({
      error: (err) => {
        console.error('Erreur lors de l\'envoi :', err);
        // ngZone.run garantit que le signal est mis à jour dans la zone Angular
        this.ngZone.run(() => this.isLoading.set(false));
      },
      complete: () => {
         // Appelé quand l'observable se termine sans erreur
        this.ngZone.run(() => this.isLoading.set(false));
      }
    });
  }
  /**
   * Gère les raccourcis clavier dans le textarea.
   * - Enter seul      → envoie le message
   * - Shift + Enter   → insère un saut de ligne (comportement natif)
   */
  handleKeyDown(event: KeyboardEvent): void {
    // Enter seul = envoi ; Shift+Enter = saut de ligne
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }
   /**
   * Redimensionne automatiquement le textarea en fonction de son contenu.
   * Remet la hauteur à 'auto' avant de la recalculer pour éviter
   * qu'elle ne grandisse indéfiniment sans jamais rétrécir.
   */
  autoResize(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }
  /**
   * Réinitialise le champ de saisie après un envoi :
   * - Vide le signal currentValue
   * - Remet la hauteur du textarea à sa valeur initiale
   */
  private resetInput(): void {
    this.currentValue.set('');
    if (this.textarea) {
      this.textarea.nativeElement.style.height = 'auto';
    }
  }
}