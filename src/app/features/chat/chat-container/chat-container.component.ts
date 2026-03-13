import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ChatFacadeService } from '../../../core/services';
import { ChatHistoryComponent, ChatInputComponent } from '../components';
import { GenericButtonComponent } from '../../../shared/components';

/**
 * Composant conteneur principal du chat (pattern Smart Component).
 *
 * Ce composant est le seul point d'injection de {@link ChatFacadeService}
 * dans la feature chat. Il orchestre les trois composants de présentation
 * enfants en leur distribuant les données et en remontant leurs événements.
 *
 * ### Responsabilités
 * - Injecter {@link ChatFacadeService} et exposer ses signaux aux enfants.
 * - Déléguer les actions utilisateur (`sendMessage`, `resetConversation`)
 *   à la façade sans contenir de logique métier.
 * - Afficher conditionnellement le bouton « Réinitialiser » lorsqu'au moins
 *   un message est présent.
 *
 * ### Arborescence des composants enfants
 * ```
 * ChatContainerComponent (Smart - injecte ChatFacadeService)
 * ├── GenericButtonComponent - bouton « Réinitialiser » (conditionnel)
 * ├── ChatHistoryComponent - liste des messages (Dumb)
 * └── ChatInputComponent - saisie utilisateur (Dumb)
 * ```
 *
 * ### Stratégie de détection de changements
 * `OnPush` : le composant ne se redessine que lorsqu'une référence d'input
 * change ou qu'un signal lu dans le template émet une nouvelle valeur.
 * Cela garantit une UI fluide même pendant une inférence IA longue.
 *
 * @public
 * @since 1.0.0
 * @see {@link ChatFacadeService} Façade d'orchestration injectée.
 * @see {@link ChatHistoryComponent} Composant d'affichage des messages.
 * @see {@link ChatInputComponent} Composant de saisie utilisateur.
 */
@Component({
    selector: 'app-chat-container',
    standalone: true,
    imports: [
        ChatHistoryComponent,
        ChatInputComponent,
        GenericButtonComponent,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './chat-container.component.html',
    styleUrls: ['./chat-container.component.scss'],
})
export class ChatContainerComponent {

    /**
     * Façade d'orchestration du chat.
     * Protégée pour être accessible dans le template sans être exposée à
     * l'extérieur du composant.
     */
    protected readonly facade = inject(ChatFacadeService);

    /**
     * Transmet le message saisi par l'utilisateur à la façade.
     *
     * Appelé par {@link ChatInputComponent} via l'Output `(messageSent)`.
     * La façade se charge de l'ajout au state, de l'appel HTTP et de la
     * mise à jour du placeholder de chargement.
     *
     * @param text - Texte saisi par l'utilisateur, déjà trimé par `ChatInputComponent`.
     *
     * @protected
     * @see {@link ChatFacadeService.sendMessage} Méthode délégataire.
     */
    protected onMessageSent(text: string): void {
        this.facade.sendMessage(text);
    }

    /**
     * Déclenche la réinitialisation complète de la conversation.
     *
     * Appelé par le bouton « Réinitialiser » via l'Output `(clicked)`.
     * La façade vide l'état local et supprime les données persistées côté
     * backend (mémoire Spring AI + messages en base de données).
     *
     * @protected
     * @see {@link ChatFacadeService.resetConversation} Méthode délégataire.
     */
    protected onConversationCleared(): void {
        this.facade.resetConversation();
    }
}