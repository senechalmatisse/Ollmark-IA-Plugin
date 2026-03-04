import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShopFieldSelector } from './shop-field-selector';
import { ContentSelectionStore } from '../../../stores/content-selection.store';
import { Shop } from '../../../models/shop.model';

describe('ShopFieldSelector - Logique UI', () => {
  let fixture: ComponentFixture<ShopFieldSelector>;
  let component: ShopFieldSelector;
  let store: ContentSelectionStore;

  const mockShopMinimal = {
    id: '1',
    label: 'Test Shop',
    address: { formatted: 'Adresse de test' },
    photos: [],
    primaryCategory: { label: 'Catégorie' }
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShopFieldSelector],
      providers: [ContentSelectionStore],
    }).compileComponents();

    fixture = TestBed.createComponent(ShopFieldSelector);
    component = fixture.componentInstance;
    store = TestBed.inject(ContentSelectionStore);
    
    fixture.componentRef.setInput('shop', mockShopMinimal as unknown as Shop);
    fixture.detectChanges();
  });

  it('should update store when an attribute is toggled', () => {
    component.onAttributeToggle('label');
    expect(store.isAttributeSelected('label')).toBeTrue();
  });

  it('should enable the confirm button only if something is selected', () => {
    const getBtn = () => fixture.nativeElement.querySelector('.confirm-btn');
    expect(getBtn().disabled).toBeTrue();
    
    store.toggleAttribute('label');
    fixture.detectChanges();
    expect(getBtn().disabled).toBeFalse();
  });
});