import {
  Component,
  signal,
  inject,
  ElementRef,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CONVERSATION_SERVICE } from '../../../core/tokens/conversation-service.token';
import { IConversationService } from '../services/i-conversation.service';

/**
 * Composant de saisie du chat.
 *
 * Ce composant dépend uniquement du contrat public IConversationService.
 * Il n'a aucune connaissance des classes concrètes de la feature.
 */
@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-input.html',
  styleUrls: ['./chat-input.css']
})
export class ChatInput {
  /**
   * Service de conversation injecté via son abstraction publique.
   */
  private readonly conversationService: IConversationService = inject(CONVERSATION_SERVICE);

  /**
   * Valeur courante du champ de saisie.
   */
  readonly currentValue = signal('');

  /**
   * Indique si le champ est focalisé.
   */
  readonly isFocused = signal(false);

  /**
   * Référence au textarea pour ajuster sa hauteur.
   */
  @ViewChild('textarea') textarea!: ElementRef<HTMLTextAreaElement>;

  /**
   * Envoie le message actuellement saisi.
   */
  onSend(): void {
    const content = this.currentValue().trim();

    if (!content) {
      return;
    }

    this.conversationService.sendMessage(content);
    this.resetInput();
  }

  /**
   * Gère le raccourci Enter pour l'envoi.
   *
   * @param event événement clavier
   */
  handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  /**
   * Ajuste automatiquement la hauteur du textarea.
   *
   * @param event événement d'entrée
   */
  autoResize(event: Event): void {
    const element = event.target as HTMLTextAreaElement;
    element.style.height = 'auto';
    element.style.height = `${element.scrollHeight}px`;
  }

  /**
   * Réinitialise le champ après envoi.
   */
  private resetInput(): void {
    this.currentValue.set('');

    if (this.textarea) {
      this.textarea.nativeElement.style.height = 'auto';
    }
  }
}