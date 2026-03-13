import { Directive, Input } from '@angular/core';
import { ChatMessage } from '../../../../core/models';

/**
 * Classe de base abstraite pour tous les composants d'affichage de message
 * (pattern Template Method - GoF Behavioural).
 *
 * Cette classe définit les propriétés et accesseurs **invariants** partagés
 * par toutes les variantes de rendu de message. Elle n'a pas de template
 * propre : les sous-classes fournissent leur propre `@Component` avec un
 * template spécifique.
 *
 * ### Pattern Template Method
 * `MessageComponent` joue le rôle de "classe abstraite" au sens GoF :
 * elle définit le squelette algorithmique (quelles données sont disponibles,
 * comment elles sont calculées) tandis que `BubbleMessageComponent` fournit
 * l'implémentation concrète du rendu visuel.
 *
 * ### Pourquoi `@Directive()` ?
 * Angular ≥ 17 exige que toute classe utilisant des décorateurs Angular
 * (`@Input`, `@Output`…) sans être un `@Component` soit décorée avec
 * `@Directive()`. Cela enregistre la classe dans le système de métadonnées
 * d'Angular et permet aux sous-classes d'hériter le binding `[message]`.
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-bubble-message',
 *   templateUrl: './bubble-message.component.html',
 * })
 * export class BubbleMessageComponent extends MessageComponent {}
 * ```
 *
 * @public
 * @since 1.0.0
 * @see {@link BubbleMessageComponent} Implémentation concrète de ce composant de base.
 * @see {@link ChatMessage} Modèle de données reçu en input.
 */
@Directive()
export class MessageComponent {

    /**
     * Le message à afficher. Requis par Angular (liaison obligatoire).
     * Toutes les propriétés calculées dépendent de cette valeur.
     */
    @Input({ required: true }) message!: ChatMessage;

    /**
     * `true` si le message a été écrit par l'utilisateur humain.
     * Utilisé dans le template pour appliquer les classes CSS `wrapper--user`
     * et `bubble--user` et aligner la bulle à droite.
     *
     * @returns `true` si `message.role === 'user'`.
     */
    get isUser(): boolean {
        return this.message.role === 'user';
    }

    /**
     * `true` si le message a été produit par l'assistant IA.
     * Utilisé dans le template pour afficher l'avatar, appliquer les classes
     * CSS `wrapper--assistant` et `bubble--assistant`, et aligner la bulle à gauche.
     *
     * @returns `true` si `message.role === 'assistant'`.
     */
    get isAssistant(): boolean {
        return this.message.role === 'assistant';
    }

    /**
     * Libellé localisé de l'auteur du message, affiché dans `aria-label`.
     *
     * Peut être surchargé dans les sous-classes pour i18n ou pour afficher
     * un nom d'utilisateur personnalisé.
     *
     * @returns `'Vous'` pour un message utilisateur, `'IA'` pour l'assistant.
     */
    get senderLabel(): string {
        return this.isUser ? 'Vous' : 'IA';
    }

    /**
     * Heure de création du message formatée en `HH:MM` (locale française).
     *
     * Utilisé dans le template pour l'horodatage affiché sous le contenu
     * et comme valeur de l'attribut `datetime` de la balise `<time>`.
     *
     * @returns Chaîne de format `HH:MM` dérivée de `message.timestamp`.
     *
     * @example
     * ```typescript
     * // Si message.timestamp = new Date('2026-03-15T19:35:53.000Z')
     * // (en timezone Europe/Paris UTC+1)
     * this.formattedTime // → '20:35'
     * ```
     */
    get formattedTime(): string {
        return this.message.timestamp.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
        });
    }
}