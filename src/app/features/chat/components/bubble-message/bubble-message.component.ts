import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MessageComponent } from '../message/message.component';

/**
 * Composant de rendu d'un message de conversation sous forme de bulle.
 *
 * Implémente le pattern Template Method en héritant de {@link MessageComponent}
 * qui fournit les accesseurs partagés (`isUser`, `isAssistant`, `formattedTime`,
 * `senderLabel`) et le binding `@Input message`.
 *
 * ### Variantes visuelles
 *
 * | Condition              | Alignement | Style appliqué               |
 * |------------------------|------------|------------------------------|
 * | `isUser`               | Droite     | `bubble--user`               |
 * | `isAssistant`          | Gauche     | `bubble--assistant` + avatar |
 * | `message.isLoading`    | Gauche     | Animation 3 points           |
 * | `message.isError`      | Gauche     | `bubble--error` (rouge)      |
 *
 * @public
 * @since 1.0.0
 * @see {@link MessageComponent} Classe de base fournissant les accesseurs partagés.
 * @see {@link ChatMessage}      Modèle de données reçu en input.
 */
@Component({
    selector: 'app-bubble-message',
    standalone: true,
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './bubble-message.component.html',
    styleUrls: ['./bubble-message.component.scss'],
})
export class BubbleMessageComponent extends MessageComponent {}