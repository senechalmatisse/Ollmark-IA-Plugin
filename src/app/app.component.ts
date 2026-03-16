import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { ChatContainerComponent } from './features/chat/chat-container/chat-container.component';
import { WebSocketService } from './core/services/websocket.service';
import { PluginBridgeService } from './core/services/plugin-bridge.service';

/**
 * Composant racine de l'application OllMark Plugin.
 *
 * Ce composant est le shell minimal de l'application. Son template se réduit
 * à `<app-chat-container />` — toute la structure UI est déléguée à
 * {@link ChatContainerComponent}.
 *
 * ### Responsabilités
 * 1. **Initialisation des services root** : `_ws` et `bridge` sont injectés
 *    ici pour forcer leur instanciation dès le démarrage de l'application,
 *    avant même qu'un composant enfant ne soit rendu. Sans cette injection
 *    explicite, les services `providedIn: 'root'` pourraient être instanciés
 *    en lazy et rater l'ouverture de la connexion WebSocket initiale.
 *
 * 2. **Synchronisation du thème** : un `effect()` réagit au signal
 *    `bridge.theme()` et applique l'attribut `data-theme` sur `<html>`.
 *    Ce mécanisme couvre deux cas :
 *    - Thème initial lu depuis `?theme=` dans l'URL de l'iframe au démarrage.
 *    - Thème mis à jour dynamiquement lors d'un `themechange` Penpot en session.
 *
 * ### Stratégie OnPush
 * Le composant ne possède aucun état réactif propre visible dans son template
 * (le template est un simple élément custom). `OnPush` est utilisé par
 * cohérence avec le reste de l'application.
 *
 * @public
 * @since 1.0.0
 * @see {@link ChatContainerComponent} Point d'entrée de toute l'interface chat.
 * @see {@link PluginBridgeService} Fournit le signal `theme`.
 * @see {@link WebSocketService} Instancié ici pour ouvrir la connexion WS au démarrage.
 */
@Component({
    selector: 'app-root',
    standalone: true,
    imports: [ChatContainerComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<app-chat-container />`,
})
export class AppComponent {

    /**
     * Force l'instanciation de {@link WebSocketService} au démarrage.
     *
     * Sans cette injection, le service ne serait instancié qu'à la première
     * utilisation (lazy), retardant l'ouverture de la connexion WebSocket et
     * la réception du `sessionId` nécessaire aux requêtes HTTP.
     *
     * @internal
     */
    private readonly _ws = inject(WebSocketService);

    /**
     * Fournit le signal `theme` consommé par l'`effect()` de synchronisation.
     *
     * @internal
     */
    private readonly _bridge = inject(PluginBridgeService);

    /**
     * Enregistre l'effet de synchronisation du thème sur l'élément `<html>`.
     *
     * L'`effect()` est déclaré dans le constructeur car c'est le contexte
     * d'injection requis par Angular pour enregistrer un effet réactif.
     */
    constructor() {
        effect(() => {
            const theme = this._bridge.theme();
            document.documentElement.dataset['theme'] = theme;
        });
    }
}