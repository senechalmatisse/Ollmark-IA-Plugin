import { Injectable, signal } from '@angular/core';

export type ToastType = 'wait' | 'success' | null;

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  readonly isVisible = signal<boolean>(false);
  readonly message = signal<string>('');
  readonly type = signal<ToastType>(null);

  private timeoutId: ReturnType<typeof setTimeout> | undefined;

  showWait(): void {
    this.type.set('wait');
    this.message.set('Veuillez patienter...');
    this.isVisible.set(true);
    
    if (this.timeoutId) clearTimeout(this.timeoutId);
  }

  showSuccess(): void {
    this.type.set('success');
    this.message.set('Contenu importé avec succès');
    this.isVisible.set(true);

    if (this.timeoutId) clearTimeout(this.timeoutId);
    
    
    this.timeoutId = setTimeout(() => {
      this.hide();
    }, 3000);
  }

  hide(): void {
    this.isVisible.set(false);
  }
}