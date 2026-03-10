import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 ***************************************************************************
 *************************************************************************** ButtonComponent
 *************************************************************************** 
 * Bouton réutilisable personnalisable (taille, couleur, padding, icône).
 *
 * Inputs:
 * width: largeur du bouton
 *   ex: 100 | "200px" | "10rem" | "auto"
 *
 * height: hauteur du bouton
 *   ex: 50 | "50px" | "3rem"
 *
 * fontSize: taille du texte
 *   ex: "16px" | "1rem"
 *
 * paddingXY: padding vertical/horizontal
 *   ex: "1rem" | [10,20] → padding: 10 20
 *
 * marginXY: marge vertical/horizontal
 *   ex: "1rem" | [10,20]
 *
 * text: texte affiché (optionnelle selon le besoin)
 *   ex: "Save"
 *
 * icon: icône (optionnelle selon le besoin)
 *   ex: "💾"
 *
 * iconSize: taille de l’icône
 *   ex: "24px" | "2rem"
 *
 * iconPadding: espace entre icône et texte (peut prendre une seule valeur ou deux valeur pour les axes X et Y)
 *   ex: "0.5rem"
 *
 * rounded: bouton arrondi 
 * (pour la valeur True le bouton sera rond, sinon le bouton aura une valeur standrad de border-radius:16px selon la maquqette FIGMA)
 *   ex: true | false
 *
 * backgroundColor: couleur de fond (par défaut noir)
 *   ex: "#007bff" | "red"
 *
 * textColor: couleur du texte (par défaut blanc)
 *   ex: "#ffffff"
 *
 * type: type HTML du bouton
 *   ex: "button" | "submit" | "reset"
 *
 * disabled: désactive le bouton
 *   ex: true
 *
 * customClass: classe CSS additionnelle (à définir dans le fichier button.component.css et l'appeller pour avec param )
 *   ex: customClass:"class-to-play-boxshadow" (définie dans button.component.css pour pouvoir être appllée avec customClass)
 *
 * Output:
 * onClick: émis lors du clic
 * ex: onClick='alert("Rock n Roll baby !")'
 * 
 * Exemple d'appel du composant dans un autre composant: 
 * <app-button 
          width="15rem"
          height="2rem"
          text="Sercecs"
          textColor="#e12727"
          [rounded]=true
          [paddingXY]="'2em'"
          fontSize="2.5rem"
          icon="https://img.icons8.com/?size=100&id=14905&format=png&color=ffffff"
          iconSize="50px"
          onClick='alert("Rock n Roll baby !")'
          customClass="class-to-play-boxshadow"
          >
    </app-button>
 */


@Component({
  selector: 'app-button',
  imports: [CommonModule],
  templateUrl: './button.component.html',
  styleUrl: './button.component.css',
})
export class ButtonComponent {
  @Input() width: string  = 'auto';
  @Input() height: string = 'auto';
  @Input() fontSize: string = 'auto';
  @Input() paddingXY: string | [string, string] = ["auto", "auto"];
  @Input() marginXY: string | [string, string] = ["auto", "auto"];
  @Input() text: string = '';
  @Input() icon: string = '';
  @Input() iconSize: string = '50px';
  @Input() iconPadding: string = '0.5rem';
  @Input() rounded: boolean = false;
  @Input() backgroundColor: string = '#000000';
  @Input() textColor: string = '#f2ebeb';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled: boolean = false;
  @Input() customClass: string = '';
  @Output() onClick = new EventEmitter<Event>();

  get buttonStyles() {
    return {
      'width': this.width ,
      'height':  this.height,
      'font-size': this.fontSize,
      'padding': Array.isArray(this.paddingXY)
        ? `${this.paddingXY[0]} ${this.paddingXY[1]}`
        : this.paddingXY,
      'margin': Array.isArray(this.marginXY)
        ? `${this.marginXY[0]} ${this.marginXY[1]}`
        : this.marginXY,
      'background-color': this.backgroundColor,
      'color': this.textColor,
      'border-radius': this.rounded ? '25px' : '16px',
      'disabled': this.disabled ? 'true' : 'false',
      'cursor': this.disabled ? 'not-allowed' : 'pointer'
    };
  }

  handleClick(event: Event) {
    if (!this.disabled) {
      this.onClick.emit(event);
    }
  }
}
