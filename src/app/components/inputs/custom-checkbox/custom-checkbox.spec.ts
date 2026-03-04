import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CustomCheckbox} from './custom-checkbox';

describe('CustomCheckbox', () => {
  let component: CustomCheckbox;
  let fixture: ComponentFixture<CustomCheckbox>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomCheckbox]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomCheckbox);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // Test pour vérifier que le composant se crée correctement
  it('devrait créer le composant sans erreur', () => {
    expect(component).toBeTruthy();
  });

  // Test pour vérifier l'affichage
  it('devrait afficher correctement le titre et le sous-titre', () => {
    fixture.componentRef.setInput("title", 'Nom');
    fixture.componentRef.setInput("subtitle", 'Boucherie');
    fixture.detectChanges();

    // On va chercher les éléments HTML générés
    const compiled = fixture.nativeElement as HTMLElement;
    const titleElement = compiled.querySelector('.checkbox-title');
    const subtitleElement = compiled.querySelector('.checkbox-subtitle');

    // On vérifie que le texte correspond bien
    expect(titleElement?.textContent).toContain('Nom');
    expect(subtitleElement?.textContent).toContain('Boucherie');
  });
});
