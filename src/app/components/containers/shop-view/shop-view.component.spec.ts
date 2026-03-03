import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ShopViewComponent } from './shop-view.component';
import { ShopApiService } from '../../../core/http/shop-api.service';
import { of, throwError } from 'rxjs';
import { Shop, ShopAddress, ShopCategory } from '../../../models/shop.model';
import { Paginated } from '../../../models/pagination.model';
import { provideRouter } from '@angular/router';

function createMockShop(overrides: Partial<Shop> = {}): Shop {
  const defaultAddress: ShopAddress = {
    street: '123 Rue du Commerce',
    city: 'Paris',
    zipCode: '75001',
    country: 'France',
    complement: null,
    phone: null,
    formatted: '123 Rue du Commerce, 75001 Paris'
  };

  return {
    id: '1',
    label: 'Ma Boutique',
    address: defaultAddress,
    humanUrl: 'ollca.com/paris/boutiques/ma-boutique',
    technicalUrl: null,
    eligibilityUrl: null,
    logo: { id: 'logo1', url: 'https://example.com/logo.jpg' },
    photos: [],
    primaryCategory: { id: 'cat1', label: 'Boulangerie' },
    geolocation: { latitude: 48.8566, longitude: 2.3522 },
    ...overrides
  };
}

describe('ShopViewComponent', () => {
  let mockShopApiService: jasmine.SpyObj<ShopApiService>;
  const mockShops: Shop[] = [
    createMockShop({ id: '1', label: 'Boutique 1' }),
    createMockShop({ id: '2', label: 'Boutique 2' })
  ];

  const mockPaginatedResponse: Paginated<Shop> = {
    content: mockShops,
    totalElements: 2,
    totalPages: 1,
    size: 20,
    number: 1,
    last: true
  };

  const mockCategories: ShopCategory[] = [
    { id: 'cat1', label: 'Boulangerie' },
    { id: 'cat2', label: 'Restaurant' }
  ];

  beforeEach(async () => {
    mockShopApiService = jasmine.createSpyObj('ShopApiService', ['search', 'getCategories', 'searchCategories']);
    mockShopApiService.search.and.returnValue(of(mockPaginatedResponse));
    mockShopApiService.getCategories.and.returnValue(of(mockCategories));

    await TestBed.configureTestingModule({
      imports: [ShopViewComponent],
      providers: [
        provideRouter([]),
        { provide: ShopApiService, useValue: mockShopApiService }
      ]
    }).compileComponents();
  });

  it('should create the component', () => {
    const fixture = TestBed.createComponent(ShopViewComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('should load shops on init', fakeAsync(() => {
    const fixture = TestBed.createComponent(ShopViewComponent);
    fixture.detectChanges();
    tick();

    expect(mockShopApiService.search).toHaveBeenCalled();
    expect(fixture.componentInstance.shops.length).toBe(2);
    expect(fixture.componentInstance.loading).toBeFalse();
  }));

  it('should load categories on init', fakeAsync(() => {
    const fixture = TestBed.createComponent(ShopViewComponent);
    fixture.detectChanges();
    tick();

    expect(mockShopApiService.getCategories).toHaveBeenCalled();
    expect(fixture.componentInstance.categoryOptions.length).toBe(2);
  }));

  it('should search shops with sort by creationDate when no query', fakeAsync(() => {
    const fixture = TestBed.createComponent(ShopViewComponent);
    fixture.detectChanges();
    tick();

    const callArgs = mockShopApiService.search.calls.mostRecent().args[0];
    expect(callArgs.sort).toEqual(['-creationDate']);
  }));

  it('should search shops with sort by score and creationDate when query present', fakeAsync(() => {
    const fixture = TestBed.createComponent(ShopViewComponent);
    fixture.detectChanges();
    tick();

    fixture.componentInstance.onSearchUpdate('boulangerie');
    tick();

    const callArgs = mockShopApiService.search.calls.mostRecent().args[0];
    expect(callArgs.q).toBe('boulangerie');
    expect(callArgs.sort).toEqual(['-score', '-creationDate']);
  }));

  it('should handle search update', fakeAsync(() => {
    const fixture = TestBed.createComponent(ShopViewComponent);
    fixture.detectChanges();
    tick();

    fixture.componentInstance.onSearchUpdate('test');
    tick();

    expect(fixture.componentInstance.searchQuery).toBe('test');
    expect(mockShopApiService.search).toHaveBeenCalledTimes(2);
  }));

  it('should handle API error gracefully', fakeAsync(() => {
    mockShopApiService.search.and.returnValue(throwError(() => new Error('API Error')));

    const fixture = TestBed.createComponent(ShopViewComponent);
    spyOn(console, 'error');
    fixture.detectChanges();
    tick();

    expect(fixture.componentInstance.loading).toBeFalse();
    expect(console.error).toHaveBeenCalled();
  }));

  it('should reset pagination on new search', fakeAsync(() => {
    const fixture = TestBed.createComponent(ShopViewComponent);
    fixture.detectChanges();
    tick();

    fixture.componentInstance.currentPage = 3;
    fixture.componentInstance.onSearchUpdate('nouvelle recherche');
    tick();

    expect(fixture.componentInstance.currentPage).toBe(1);
  }));

  it('should set hasMore based on API response', fakeAsync(() => {
    const responseWithMore: Paginated<Shop> = {
      ...mockPaginatedResponse,
      last: false
    };
    mockShopApiService.search.and.returnValue(of(responseWithMore));

    const fixture = TestBed.createComponent(ShopViewComponent);
    fixture.detectChanges();
    tick();

    expect(fixture.componentInstance.hasMore).toBeTrue();
  }));

  it('should log when onGenerate is called', () => {
    const fixture = TestBed.createComponent(ShopViewComponent);
    const shop = createMockShop({ label: 'Test Shop' });
    spyOn(console, 'log');

    fixture.componentInstance.onGenerate(shop);

    expect(console.log).toHaveBeenCalledWith('Générer pour :', 'Test Shop');
  });

  it('should log when onAdd is called', () => {
    const fixture = TestBed.createComponent(ShopViewComponent);
    const shop = createMockShop({ label: 'Test Shop' });
    spyOn(console, 'log');

    fixture.componentInstance.onAdd(shop);

    expect(console.log).toHaveBeenCalledWith('Ajouter :', 'Test Shop');
  });
});
