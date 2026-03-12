import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { IApiService } from '../features/chat/services/IApi.service';
import { ApiService } from '../features/chat/services/api.service';
import { IConversationService } from '../features/chat/services/IConversation.service';
import { ConversationService } from '../features/chat/services/conversation.service';


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideClientHydration(withEventReplay()),

    // Liaison abstraction → implémentation concrète
    { provide: IApiService,          useClass: ApiService },
    { provide: IConversationService, useClass: ConversationService },
  ],
};