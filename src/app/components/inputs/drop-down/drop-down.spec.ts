import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DropDownComponent, DropDownOption } from './drop-down'; 
import { By } from '@angular/platform-browser';

describe('DropDownComponent', () => {
  let component: DropDownComponent;
  let fixture: ComponentFixture<DropDownComponent>;

  // mes données
  const mockOptions: DropDownOption[] = [
    { key: 'cat_1', value: 'Boulangerie' },
    { key: 'cat_2', value: 'Boucherie' }
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropDownComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DropDownComponent);
    component = fixture.componentInstance;
    
    // On initialise les inputs pour le test
    component.label = 'Catégorie';
    component.options = mockOptions;
    
    fixture.detectChanges();
  });

  // je test si je peux créer un composant
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // j ai vérifié le nbr d'option
  it('should render the correct number of options', () => {
    const selectItems = fixture.debugElement.queryAll(By.css('option'));
    // +1 car il y a l'option par défaut "Choisir "
    expect(selectItems.length).toBe(mockOptions.length + 1);
  });

  // je teste si je récupere la bonne clé
  it('should emit the selected key when an option is selected', () => {
    spyOn(component.selectionChange, 'emit');

    const select = fixture.debugElement.query(By.css('select')).nativeElement;
    select.value = mockOptions[0].key; // On choisit "Boulangerie" (cat_1)
    select.dispatchEvent(new Event('change'));

    fixture.detectChanges();

    expect(component.selectionChange.emit).toHaveBeenCalledWith('cat_1');
  });
//je teste ici si le contenu de mes options
  it('should render correct option values', () => {
  const options = fixture.debugElement.queryAll(By.css('option'));

  expect(options[1].nativeElement.textContent).toContain('Boulangerie');
  expect(options[2].nativeElement.textContent).toContain('Boucherie');
});
});