import {
    AfterViewChecked,
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    Input,
    ViewChild,
} from '@angular/core';
import { ChatMessage } from '../../../../core/models';
import { BubbleMessageComponent } from '../bubble-message/bubble-message.component';

/**
 * Composant de présentation affichant la liste scrollable des messages (Dumb Component).
 *
 * Ce composant est **pur** : son rendu dépend exclusivement de ses `@Input`.
 * Il n'injecte aucun service, ne connaît pas `ChatStateService` et peut être
 * testé unitairement avec de simples fixtures de `ChatMessage[]`.
 *
 * ### Responsabilités
 * 1. Afficher la liste des messages reçus via `@Input messages`.
 * 2. Scroller automatiquement vers le bas après chaque cycle de rendu.
 *
 * ### Scroll automatique
 * `AfterViewChecked` est utilisé pour scroller après **chaque** cycle de détection
 * de changements, y compris lors de l'ajout d'un nouveau message ou de la mise
 * à jour du contenu d'un message existant (résolution d'un placeholder de chargement).
 * `scrollToBottom()` est un no-op si le conteneur n'est pas encore rendu.
 *
 * ### Stratégie OnPush
 * Le composant ne se redessine que lorsque la référence du tableau `messages`
 * change. `ChatStateService` produit un nouveau tableau à chaque mutation
 * (`_messages.update()`), ce qui déclenche correctement la détection.
 *
 * @public
 * @since 1.0.0
 * @see {@link BubbleMessageComponent} Composant de rendu de chaque message individuel.
 * @see {@link ChatMessage} Modèle de données reçu en input.
 * @see {@link ChatContainerComponent} Composant parent qui fournit les messages.
 */
@Component({
    selector: 'app-chat-history',
    standalone: true,
    imports: [BubbleMessageComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './chat-history.component.html',
    styleUrls: ['./chat-history.component.scss'],
})
export class ChatHistoryComponent implements AfterViewChecked {

    /**
     * Liste ordonnée des messages à afficher.
     *
     * Requis : le composant parent (`ChatContainerComponent`) doit toujours
     * fournir ce binding. Un tableau vide est la valeur initiale par défaut
     * (le composant affiche un état vide sans erreur).
     *
     * Chaque message est tracké par son `id` dans le `@for` du template pour
     * des mises à jour DOM minimales lors des mutations.
     */
    @Input({ required: true }) messages: ChatMessage[] = [];

    /**
     * Référence native à l'élément DOM `.chat-history` portant `#scrollContainer`.
     * Utilisée par `scrollToBottom()` pour manipuler `scrollTop` directement.
     * Peut être `undefined` avant le premier rendu, toutes les utilisations
     * sont protégées par un guard optionnel (`?.nativeElement`).
     *
     * @internal
     */
    @ViewChild('scrollContainer')
    private readonly _scrollContainer!: ElementRef<HTMLElement>;

    /**
     * `true` si la liste contient au moins un message.
     * Utilisé dans le template pour conditionner l'affichage de la `<ul>`.
     *
     * @returns `true` si `messages.length > 0`.
     *
     * @protected
     */
    protected get hasMessages(): boolean {
        return this.messages.length > 0;
    }

    // ── Cycle de vie ──────────────────────────────────────────────────────────

    /**
     * Déclenche le scroll vers le bas après chaque cycle de rendu.
     *
     * `AfterViewChecked` est préféré à `AfterViewInit` car il réagit également
     * aux mises à jour du DOM qui suivent l'ajout de nouveaux messages ou la
     * résolution d'un placeholder de chargement (changement de hauteur de la liste).
     *
     * La fréquence d'appel peut être élevée (un appel par cycle de détection),
     * mais `scrollToBottom()` est une opération O(1) sur la propriété DOM
     * `scrollTop` — son coût est négligeable.
     */
    ngAfterViewChecked(): void {
        this.scrollToBottom();
    }

    /**
     * Fait défiler le conteneur de messages jusqu'en bas.
     *
     * Assigne `scrollTop = scrollHeight` pour positionner la vue sur le
     * dernier message. L'opération est un no-op si `_scrollContainer` n'est
     * pas encore initialisé (avant le premier rendu du template).
     *
     * @private
     */
    private scrollToBottom(): void {
        const el = this._scrollContainer?.nativeElement;
        if (el) el.scrollTop = el.scrollHeight;
    }
}