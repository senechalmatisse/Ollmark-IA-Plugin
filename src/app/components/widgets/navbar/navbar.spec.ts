import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { NavbarComponent } from './navbar';

describe('NavbarComponent', () => {
  let component: NavbarComponent;
  let fixture: ComponentFixture<NavbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarComponent],
      providers: [provideRouter([])] 
    }).compileComponents();

    fixture = TestBed.createComponent(NavbarComponent);
    component = fixture.componentInstance;
    
    fixture.componentRef.setInput('tabs', [
      { label: 'Boutique', route: '/boutique' },
      { label: 'Produit', route: '/produit' }
    ]);
    fixture.componentRef.setInput('rightButtonLabel', 'Sélectionné');
    
    fixture.detectChanges(); 
  });
  //Vérifie que le composant démarre sans erreur fatale.
  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  //Vérifie que la boucle @for genere bien exactement 2 balises
  it('should render the correct number of nav links', () => {
    const links = fixture.nativeElement.querySelectorAll('a');
    expect(links.length).toBe(2);
  });

  //Vérifie  l'événement 'selectedClick' et on déclenche la méthode 'clickOnSelected' pour vérifier que l'événement est émis avec le bon label.
  it('should emit selectedClick with rightButtonLabel when right button is clicked', () => {
    spyOn(component.selectedClick, 'emit');
    component.clickOnSelected();
    expect(component.selectedClick.emit).toHaveBeenCalledWith('Sélectionné');
  });

  //Vérifie Si on retire le texte du bouton droit, la balise <button> ne doit plus exister dans le HTML.
  it('should not render the button if rightButtonLabel is not provided', () => {
    fixture.componentRef.setInput('rightButtonLabel', undefined);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeNull();
  });

  
});