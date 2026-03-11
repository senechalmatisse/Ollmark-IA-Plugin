import { Signal } from '@angular/core';
import { IMessage } from '../../../app/message/message';

/**
 * Contrat public de la feature chat injecté dans les composants smart.
 *
 * Cette interface expose uniquement :
 * - les signaux lisibles par l'interface
 * - les actions métier déclenchables par les composants
 *
 * Les composants ne doivent dépendre que de ce contrat
 * et jamais d'une classe concrète.
 */
export interface IConversationService {
    /**
     * Historique courant des messages affichés dans le chat.
     */
    readonly messages: Signal<IMessage[]>;

    /**
     * Indique si une réponse est actuellement en cours de streaming.
     */
    readonly isStreaming: Signal<boolean>;

    /**
     * Envoie un message utilisateur dans la conversation.
     *
     * @param content contenu textuel à envoyer
     */
    sendMessage(content: string): void;

    /**
     * Réinitialise complètement la conversation côté interface.
     */
    resetConversation(): void;
}