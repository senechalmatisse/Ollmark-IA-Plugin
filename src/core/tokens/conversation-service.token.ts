import { InjectionToken } from '@angular/core';
import { IConversationService } from '../../features/chat/services/i-conversation.service';

/**
 * Token d'injection Angular du contrat public de conversation.
 *
 * Il permet d'injecter l'abstraction IConversationService
 * au lieu d'une implémentation concrète.
 */
export const CONVERSATION_SERVICE = new InjectionToken<IConversationService>(
    'CONVERSATION_SERVICE'
);