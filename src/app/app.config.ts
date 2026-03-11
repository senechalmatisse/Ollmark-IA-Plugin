import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';
import { CONVERSATION_SERVICE } from '../core/tokens/conversation-service.token';
import { ConversationService } from '../features/chat/services/conversation-service';

/**
 * Configuration racine de l'application Angular.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),
    {
      provide: CONVERSATION_SERVICE,
      useExisting: ConversationService
    }
  ]
};