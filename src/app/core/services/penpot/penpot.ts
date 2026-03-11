import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Service responsible for communication between the Angular application
 * and the Penpot plugin background script.
 */
@Injectable({
  providedIn: 'root',
})
export class Penpot {
  /** Observable containing the current Penpot project (file) ID. */
  private fileIdSubject = new BehaviorSubject<string | null>(null);
  /** Stream of the current file ID. Subscribe to this to react to Penpot context changes. */
  public fileId$: Observable<string | null> = this.fileIdSubject.asObservable();

  constructor(private ngZone: NgZone) {
    this.listenToPenpotMessages();
    this.sendReadyMessage();
  }

  /**
   * Notifies the Penpot plugin script that the Angular UI is loaded and ready
   * to receive data (handshake).
   */
  private sendReadyMessage(): void {
    this.sendMessageToPlugin({ type: 'ready' });
  }

  /**
   * Sets up the event listener for window messages sent by the Penpot plugin.
   * Handles messages such as 'fileId' to update the service state.
   */
  private listenToPenpotMessages(): void {
    window.addEventListener('message', (event) => {
      const message = event.data;
      
      if (message && message.type === 'fileId') {
        // We wrap in ngZone.run to ensure Angular change detection is triggered
        this.ngZone.run(() => {
          this.fileIdSubject.next(message.fileId);
        });
      }
    });
  }

  /**
   * Sends a message from the Angular UI to the Penpot plugin background script.
   * Uses `parent.postMessage` because the plugin UI runs in an iframe.
   * 
   * @param message The message object to send.
   */
  public sendMessageToPlugin(message: any): void {
    parent.postMessage(message, '*');
  }
}
