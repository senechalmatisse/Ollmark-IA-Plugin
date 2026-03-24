import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    signal,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

/**
 * Composant de saisie du message utilisateur (Dumb Component).
 *
 * Ce composant est **pur** : son comportement dépend exclusivement de ses
 * `@Input` et il communique vers l'extérieur uniquement via ses `@Output`.
 * Il ne connaît pas `ChatFacadeService` et peut être testé unitairement en isolation.
 *
 * ### Responsabilités
 * 1. Maintenir le brouillon du message en cours (`draft` signal).
 * 2. Émettre `messageSent` lorsque l'utilisateur envoie.
 * 3. Auto-redimensionner le textarea selon son contenu (min 1 ligne, max 130 px).
 * 4. Gérer les états désactivés (`isLoading`, `enabled`).
 *
 * ### Comportement clavier
 * - `Enter` sans `Shift` → soumet le message.
 * - `Shift + Enter` → insère un saut de ligne dans le textarea.
 *
 * @public
 * @since 1.0.0
 * @see {@link ChatContainerComponent} Composant parent qui fournit les inputs.
 */
@Component({
    selector: 'app-chat-input',
    standalone: true,
    imports: [CommonModule, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './chat-input.component.html',
    styleUrls: ['./chat-input.component.scss'],
})
export class ChatInputComponent {

    // ── Inputs ────────────────────────────────────────────────────────────────

    /**
     * `true` si une inférence IA est en cours.
     * Désactive le textarea et le bouton d'envoi pendant la génération.
     *
     * @defaultValue `false`
     */
    @Input() isLoading = false;

    /**
     * `true` si le composant est prêt à recevoir un message.
     * `false` tant que le handshake avec `plugin.ts` n'est pas complété
     * (signal `projectId` encore `null`). Évite d'envoyer un message sans
     * projectId valide.
     *
     * @defaultValue `false`
     */
    @Input() enabled = false;

    // ── Outputs ───────────────────────────────────────────────────────────────

    /**
     * Émis lorsque l'utilisateur soumet un message non vide.
     * La valeur émise est le texte trimé - `ChatContainerComponent` le transmet
     * à `ChatFacadeService.sendMessage()`.
     */
    @Output() messageSent = new EventEmitter<string>();

    // ── ViewChild ─────────────────────────────────────────────────────────────

    /**
     * Référence native au `<textarea>` portant `#textareaEl`.
     * Utilisée dans `submit()` pour réinitialiser la hauteur après envoi.
     *
     * @internal
     */
    @ViewChild('textareaEl')
    private readonly _textareaEl!: ElementRef<HTMLTextAreaElement>;

    // ── État interne ──────────────────────────────────────────────────────────

    /**
     * Brouillon du message en cours de saisie.
     * Signal privé exposé au template via `protected` pour que `OnPush`
     * détecte les changements sans `ChangeDetectorRef`.
     */
    protected readonly draft = signal('');

    /**
     * `true` lorsque le textarea a le focus.
     * Utilisé pour appliquer le style d'anneau de focus sur `.input-inner`.
     */
    protected readonly isFocused = signal(false);

    // ── Handlers du template ──────────────────────────────────────────────────

    /**
     * Redimensionne dynamiquement le textarea pour s'adapter à son contenu.
     *
     * La technique "reset to auto puis scrollHeight" garantit que la hauteur
     * se réduit correctement quand l'utilisateur efface du texte.
     * La hauteur est bornée entre `min-height: 22px` et `max-height: 130px`
     * par le CSS (overflow-y: auto au-delà).
     *
     * @param event - L'événement `input` natif émis par le textarea.
     *
     * @protected
     */
    protected autoResize(event: Event): void {
        const el = event.target as HTMLTextAreaElement;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }

    /**
     * Gère la touche `Enter` dans le textarea.
     *
     * - `Enter` seul → prévient le saut de ligne par défaut et soumet le message.
     * - `Shift + Enter` → laisse le comportement natif (insertion d'un `\n`).
     *
     * @param event - L'événement `keydown` natif émis par le textarea.
     *
     * @protected
     */
    protected onEnterKey(event: Event): void {
        const ke = event as KeyboardEvent;
        if (!ke.shiftKey) {
            ke.preventDefault();
            this.submit();
        }
    }

    /**
     * Soumet le brouillon si les conditions sont remplies.
     *
     * ### Conditions de soumission
     * - Le brouillon trimmé est non vide.
     * - `isLoading` est `false` (pas d'inférence en cours).
     * - `enabled` est `true` (projectId résolu).
     *
     * ### Après soumission
     * - Émet `messageSent` avec le texte trimé.
     * - Vide le signal `draft`.
     * - Remet la hauteur du textarea à `'auto'` pour revenir à 1 ligne.
     *
     * @protected
     */
    protected submit(): void {
        const text = this.draft().trim();
        if (!text || this.isLoading || !this.enabled) return;

        this.messageSent.emit(text);
        this.draft.set('');

        if (this._textareaEl) {
            this._textareaEl.nativeElement.style.height = 'auto';
        }
    }
}