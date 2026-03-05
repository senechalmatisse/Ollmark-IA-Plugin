import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SelectedView } from './selected-view';
import { ShopSelectionStore } from '../../stores/shop-selection.store';
import { Shop } from '../../models/shop.model';
import { PENPOT_SERVICE } from '../../core/penpot/penpot.service';
describe('SelectedView - Logique de Sélection', () => {
  let fixture: ComponentFixture<SelectedView>;
  let component: SelectedView;
  let store: ShopSelectionStore;
  
  const mockPenpotService = jasmine.createSpyObj('IPenpotService', ['createText', 'createImage', 'notify', 'closePlugin']);
  const mockShop = {
    id: 'shop-123',
    label: 'Boucherie Saint Clement',
    address: { formatted: '96 Rue Louis Blanc, 76100 Rouen' },
    humanUrl: 'ollca.com/rouen/boutique',
    primaryCategory: { label: 'Boucherie' },
    photos: [{ id: 'p1', url: 'url1' }]
  } as unknown as Shop;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectedView],
      providers: [ShopSelectionStore, { provide: PENPOT_SERVICE, useValue: mockPenpotService }],
    }).compileComponents();

    fixture = TestBed.createComponent(SelectedView);
    component = fixture.componentInstance;
    store = TestBed.inject(ShopSelectionStore);
    
    store.addEntry(mockShop, ['label'], []);
    fixture.detectChanges();
  });

  describe('Initialisation', () => {
    it('should create the component', () => {
      expect(component).toBeTruthy();
    });

    it('should display the shop label in the list', () => {
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Boucherie Saint Clement');
    });
  });

  describe('Actions du Store', () => {
    it('should call store.removeEntry when removeEntry is invoked', () => {
      spyOn(store, 'removeEntry');
      component.removeEntry('shop-123');
      expect(store.removeEntry).toHaveBeenCalledWith('shop-123');
    });

    it('should toggle attribute in store', () => {
      const entry = store.entries()[0];
      spyOn(store, 'toggleAttribute');
      component.onAttributeToggle(entry, 'address');
      expect(store.toggleAttribute).toHaveBeenCalledWith('shop-123', 'address');
    });
  });

  describe('Affichage des attributs (getSubtitleForAttribute)', () => {
    it('should return correct subtitle for label', () => {
      const entry = store.entries()[0];
      const result = component.getSubtitleForAttribute(entry, 'label');
      expect(result).toBe('Boucherie Saint Clement');
    });

    it('should return correct subtitle for address', () => {
      const entry = store.entries()[0];
      const result = component.getSubtitleForAttribute(entry, 'address');
      expect(result).toBe('96 Rue Louis Blanc, 76100 Rouen');
    });

    it('should return empty string for unknown attribute', () => {
      const entry = store.entries()[0];
      const result = component.getSubtitleForAttribute(entry, 'unknown');
      expect(result).toBe('');
    });
  });
});