import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShopViewComponent } from './shop-view.component';
import { ShopApiService } from '../../../core/http/shop-api.service';
import { of } from 'rxjs';
import { Shop } from '../../../models/shop.model';
import { provideRouter } from '@angular/router'; 

describe('ShopViewComponent', () => {
  let component: ShopViewComponent;
  let fixture: ComponentFixture<ShopViewComponent>;
  let mockShopApiService: jasmine.SpyObj<ShopApiService>;

  beforeEach(async () => {
    mockShopApiService = jasmine.createSpyObj('ShopApiService', ['getCategories', 'search']);
    
    mockShopApiService.getCategories.and.returnValue(of([]));
    mockShopApiService.search.and.returnValue(of({
      content: [],
      totalElements: 0,
      totalPages: 1,
      size: 10,
      number: 1,
      last: true
    }));

    await TestBed.configureTestingModule({
      imports: [ShopViewComponent], 
      providers: [
        { provide: ShopApiService, useValue: mockShopApiService },
        provideRouter([]) 
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ShopViewComponent);
    component = fixture.componentInstance;
  });

  it('devrait créer le composant', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('Initialisation (ngOnInit)', () => {
    it('devrait charger les catégories et la première page de boutiques au démarrage', () => {
      const mockCategories = [
        { id: '1', label: 'Boulangerie' },
        { id: '2', label: 'Boucherie' }
      ];
      mockShopApiService.getCategories.and.returnValue(of(mockCategories));

      const mockShops = [
        { id: 'shop-1', label: 'Ma Super Boutique' } as Shop
      ];
      

      mockShopApiService.search.and.returnValue(of({
        content: mockShops,
        totalPages: 2,
        totalElements: 20, 
        size: 10,          
        number: 1,         
        last: false       
      }));

      fixture.detectChanges(); 

      expect(mockShopApiService.getCategories).toHaveBeenCalled();
      expect(mockShopApiService.search).toHaveBeenCalled();
      expect(component.categoryOptions.length).toBe(2);
      expect(component.shops.length).toBe(1);
      expect(component.loading).toBeFalse();
      expect(component.hasMorePages).toBeTrue(); 
    });
  });

  describe('Pagination (Scroll Infini)', () => {
    it('devrait ajouter la page suivante à la liste existante', () => {
      component.shops = [{ id: 'shop-1', label: 'Boutique 1' } as Shop];
      component.currentPage = 1;
      component.hasMorePages = true;
      component.loading = false;

    
      const fauxResultatPage2 = {
        content: [{ id: 'shop-2', label: 'Boutique 2' } as Shop],
        totalPages: 2,
        totalElements: 20, 
        size: 10,          
        number: 2,         
        last: true         
      };
      
      mockShopApiService.search.and.returnValue(of(fauxResultatPage2));
      
      component.onLoadMore();

      expect(component.currentPage).toBe(2);
      expect(component.shops.length).toBe(2); 
      expect(component.shops[1].label).toBe('Boutique 2');
      expect(component.hasMorePages).toBeFalse(); 
    });
  });
});