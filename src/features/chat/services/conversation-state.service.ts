import { Injectable, signal } from '@angular/core';
import { IMessage } from '../../../app/message/message';

/**
 * Service responsable de l'état réactif de l'interface de conversation.
 *
 * Ce service est l'unique propriétaire des signaux Angular liés au chat.
 * Il ne contient aucune logique réseau et ne dépend d'aucun service API.
 *
 * Responsabilités :
 * - stocker les messages
 * - stocker les indicateurs d'état de l'interface
 * - exposer les mutations internes de l'état
 */
@Injectable({
    providedIn: 'root'
})
export class ConversationStateService {
    /**
    * Historique réactif des messages.
    */
    readonly messages = signal<IMessage[]>([]);

    /**
    * Indique si une réponse IA est en cours de streaming.
    */
    readonly isStreaming = signal<boolean>(false);

    /**
    * Indique si une action asynchrone liée à la conversation est en cours.
    */
    readonly pendingAction = signal<boolean>(false);

    /**
    * Ajoute un message à la fin de l'historique.
    *
    * @param message message à ajouter
    */
    addMessage(message: IMessage): void {
        this.messages.update((currentMessages) => [...currentMessages, message]);
    }

    /**
    * Met à jour le contenu du dernier message IA de la conversation.
    *
    * Si aucun message n'existe, aucune modification n'est appliquée.
    *
    * @param content nouveau contenu du dernier message IA
    */
    updateLastAiMessage(content: string): void {
        this.messages.update((currentMessages) => {
        if (currentMessages.length === 0) {
            return currentMessages;
        }

        const updatedMessages = [...currentMessages];
        const lastIndex = updatedMessages.length - 1;
        const lastMessage = updatedMessages[lastIndex];

        updatedMessages[lastIndex] = {
            ...lastMessage,
            content
        };

        return updatedMessages;
        });
    }

    /**
    * Met à jour l'indicateur de streaming.
    *
    * @param value nouvelle valeur
    */
    setIsStreaming(value: boolean): void {
        this.isStreaming.set(value);
    }

    /**
    * Met à jour l'indicateur d'action en attente.
    *
    * @param value nouvelle valeur
    */
    setPendingAction(value: boolean): void {
        this.pendingAction.set(value);
    }

    /**
    * Réinitialise complètement l'état de la conversation.
    */
    reset(): void {
        this.messages.set([]);
        this.isStreaming.set(false);
        this.pendingAction.set(false);
    }
}