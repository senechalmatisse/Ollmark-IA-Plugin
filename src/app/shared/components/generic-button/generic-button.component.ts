import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Composant bouton générique et composable (Shared / Presentational Component).
 *
 * Ce composant est le seul bouton de l'application. Il accepte une icône SVG,
 * un libellé texte, ou les deux simultanément — et adapte son layout et son
 * padding en conséquence. Il ne contient aucune logique métier.
 *
 * ### Variantes disponibles
 *
 * | `variant`   | Usage                                        |
 * |-------------|----------------------------------------------|
 * | `'primary'` | Action principale (fond turquoise)           |
 * | `'ghost'`   | Action secondaire (transparent + bordure)    |
 * | `'danger'`  | Action destructive (rouge, ex : Réinitialiser) |
 *
 * ### Combinaisons icône / texte
 *
 * | `icon` | `text` | Classe ajoutée | Padding    |
 * |--------|--------|----------------|------------|
 * | ✓      | ✗      | `icon-only`    | `8px`      |
 * | ✗      | ✓      | —              | `8px 14px` |
 * | ✓      | ✓      | —              | `8px 14px` |
 *
 * ### Format de l'icône
 * `icon` attend la valeur de l'attribut `d` d'un `<path>` SVG (viewBox 24×24).
 * L'icône est rendue dans un `<svg>` avec `aria-hidden="true"` - le label
 * accessible du bouton provient de `text` ou de `aria-label`.
 *
 * @example
 * ```html
 * <!-- Bouton texte seul -->
 * <app-generic-button text="Enregistrer" (clicked)="save()" />
 *
 * <!-- Bouton icône seule -->
 * <app-generic-button
 *   icon="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13..."
 *   variant="ghost"
 *   (clicked)="openMenu()"
 * />
 *
 * <!-- Bouton danger avec icône + texte -->
 * <app-generic-button
 *   variant="danger"
 *   text="Réinitialiser"
 *   icon="M3 12a9 9 0 1 0 9-9..."
 *   [disabled]="isLoading"
 *   (clicked)="reset()"
 * />
 * ```
 *
 * @public
 * @since 1.0.0
 */
@Component({
    selector: 'app-generic-button',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './generic-button.component.html',
    styleUrls: ['./generic-button.component.scss'],
})
export class GenericButtonComponent {

    // ── Inputs ────────────────────────────────────────────────────────────────

    /**
     * Valeur de l'attribut `d` d'un `<path>` SVG (viewBox 24×24).
     * Si fourni seul (sans `text`), la classe `icon-only` est ajoutée au bouton
     * pour appliquer un padding carré.
     *
     * @defaultValue `undefined` (pas d'icône)
     */
    @Input() icon?: string | null;

    /**
     * Libellé textuel affiché dans le bouton.
     * Sert également de valeur à `aria-label` si aucun `aria-label` explicite
     * n'est fourni, garantissant l'accessibilité des boutons icône + texte.
     *
     * @defaultValue `undefined` (pas de texte)
     */
    @Input() text?: string | null;

    /**
     * Désactive le bouton visuellement (opacité réduite, cursor not-allowed)
     * et empêche l'émission de `clicked` dans `handleClick()`.
     *
     * @defaultValue `false`
     */
    @Input() disabled = false;

    /**
     * Variante visuelle du bouton.
     * Détermine les couleurs, la bordure et les états hover/active.
     *
     * @defaultValue `'primary'`
     */
    @Input() variant: 'primary' | 'ghost' | 'danger' = 'primary';

    /**
     * Type HTML natif du bouton (`type` attribute).
     * Utiliser `'submit'` pour les boutons dans des `<form>`.
     *
     * @defaultValue `'button'`
     */
    @Input() type: 'button' | 'submit' = 'button';

    // ── Outputs ───────────────────────────────────────────────────────────────

    /**
     * Émis lorsque l'utilisateur clique sur le bouton et que `disabled` est `false`.
     * Le composant parent écoute cet Output plutôt que `(click)` natif pour
     * bénéficier du guard `disabled` centralisé dans `handleClick()`.
     */
    @Output() clicked = new EventEmitter<void>();

    // ── Propriétés calculées ──────────────────────────────────────────────────

    /**
     * Calcule la chaîne de classes CSS à appliquer au `<button>` natif.
     *
     * Compose toujours la variante (`primary`, `ghost`, `danger`) et ajoute
     * `icon-only` quand une icône est fournie sans texte.
     *
     * @returns Chaîne de classes séparées par des espaces, ex : `"danger icon-only"`.
     *
     * @example
     * ```typescript
     * // icon = 'M3 12...', text = null, variant = 'danger'
     * this.computedClass // → 'danger icon-only'
     *
     * // icon = null, text = 'Enregistrer', variant = 'primary'
     * this.computedClass // → 'primary'
     * ```
     */
    get computedClass(): string {
        const classes: string[] = [this.variant];
        if (this.icon && !this.text) classes.push('icon-only');
        return classes.join(' ');
    }

    // ── Handlers ──────────────────────────────────────────────────────────────

    /**
     * Émet `clicked` si et seulement si le bouton n'est pas désactivé.
     *
     * Ce guard est nécessaire car Angular peut appeler le handler `(click)`
     * même sur un bouton `[disabled]="true"` dans certaines configurations.
     * Centraliser le guard ici évite de le dupliquer dans chaque consommateur.
     */
    handleClick(): void {
        if (!this.disabled) this.clicked.emit();
    }
}