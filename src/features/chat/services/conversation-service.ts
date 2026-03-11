import { Injectable, Signal } from '@angular/core';
import { IConversationService } from './i-conversation.service';
import { ConversationStateService } from './conversation-state.service';
import { IMessage } from '../../../app/message/message';
import { UserMessage } from '../../../app/message/user-message';

/**
 * Façade publique de la feature chat.
 *
 * Ce service constitue le point d'entrée unique utilisé par les composants.
 * Il délègue la gestion de l'état à ConversationStateService.
 *
 * Dans le périmètre de ce ticket, il ne contient pas de logique réseau.
 * Il orchestre seulement les actions publiques et l'état exposé à l'interface.
 */
@Injectable({
    providedIn: 'root'
})
export class ConversationService implements IConversationService {
    /**
    * @param conversationStateService service interne responsable des signaux
    */
    constructor(private readonly conversationStateService: ConversationStateService) {}

    /**
    * Expose l'historique réactif des messages.
    */
    get messages(): Signal<IMessage[]> {
        return this.conversationStateService.messages;
    }

    /**
    * Expose l'état de streaming.
    */
    get isStreaming(): Signal<boolean> {
        return this.conversationStateService.isStreaming;
    }

    /**
     * Envoie un message utilisateur.
     *
     * Pour ce ticket, cette action ajoute simplement le message
     * dans l'état conversationnel.
     *
     * @param content contenu du message
     */
    sendMessage(content: string): void {
        const trimmedContent = content.trim();

    if (!trimmedContent) {
        return;
    }

    this.conversationStateService.addMessage(
        new UserMessage(this.generateMessageId(), trimmedContent)
    );
    }

    /**
    * Réinitialise complètement la conversation.
    */
    resetConversation(): void {
        this.conversationStateService.reset();
    }

    /**
    * Génère un identifiant simple de message local.
    *
    * @returns identifiant de message
    */
    private generateMessageId(): string {
        return Date.now().toString();
    }
}