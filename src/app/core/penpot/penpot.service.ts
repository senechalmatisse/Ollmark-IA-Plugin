
import { InjectionToken } from '@angular/core';


type UIToPluginMessage =
  | { type: 'create-text'; content: string }
  | { type: 'create-rectangle-with-image'; content: string }
  | { type: 'notify'; content: string }
  | { type: 'close' };


type PluginToUIMessage =
  | { type: 'notify'; content: string }
  | { type: 'done'; action: string };

export interface IPenpotService {
  isSimulation: boolean;
  createText(text: string): void;
  createImage(url: string): void;
  notify(message: string): void;
  closePlugin(): void;
}


export const PENPOT_SERVICE = new InjectionToken<IPenpotService>('PENPOT_SERVICE');


export function penpotServiceFactory(): IPenpotService {
  
  const isInsidePenpot = window.parent !== window;

  if (isInsidePenpot) {
   
    window.addEventListener('message', (event) => {
      
      if (event.source !== globalThis.parent) {
        return; 
      }
      
        const message = event.data as PluginToUIMessage;

      if (message.type === 'notify') {
        console.log(`[Penpot Notify] ${message.content}`);
       
      }

      if (message.type === 'done') {
        console.log(`[Penpot] Action réussie : ${message.action}`);
      }
    });
  }

  /**
   * Helper pour envoyer les messages typés au parent (plugin.ts)
   */
  const sendMessage = (msg: UIToPluginMessage) => {
    if (isInsidePenpot) {
      window.parent.postMessage(msg, '*');
    } else {
      // Mode développement local hors de Penpot
      console.log('%c[Simulation Penpot]', 'color: #6366f1; font-weight: bold', msg);
    }
  };

  return {
    isSimulation: !isInsidePenpot,

    createText: (text: string) => {
      sendMessage({ type: 'create-text', content: text });
    },

    createImage: (url: string) => {
      
      sendMessage({ type: 'create-rectangle-with-image', content: url });
    },

    notify: (message: string) => {
      sendMessage({ type: 'notify', content: message });
    },

    closePlugin: () => {
      
      sendMessage({ type: 'close' });
    }
  };
}