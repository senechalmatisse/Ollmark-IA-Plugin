import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { App } from './app';
import { ShopApiService } from './core/http/shop-api.service';
import { of, throwError } from 'rxjs';
import { Shop, ShopAddress } from './models/shop.model';
import { Paginated } from './models/pagination.model';

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

describe('App', () => {
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

  beforeEach(async () => {
    mockShopApiService = jasmine.createSpyObj('ShopApiService', ['search', 'getCategories', 'searchCategories']);
    mockShopApiService.search.and.returnValue(of(mockPaginatedResponse));

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: ShopApiService, useValue: mockShopApiService }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should set document title on init', fakeAsync(() => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    tick();
    expect(document.title).toBe('Ollca - Génération Contenu');
  }));

  it('should load shops on init', fakeAsync(() => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    tick();

    expect(mockShopApiService.search).toHaveBeenCalled();
    expect(fixture.componentInstance.shops.length).toBe(2);
    expect(fixture.componentInstance.loading).toBeFalse();
  }));

  it('should handle search', fakeAsync(() => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    tick();

    fixture.componentInstance.onSearch('boulangerie');
    tick();

    expect(fixture.componentInstance.searchQuery).toBe('boulangerie');
    expect(mockShopApiService.search).toHaveBeenCalled();
  }));

  it('should handle API error gracefully', fakeAsync(() => {
    mockShopApiService.search.and.returnValue(throwError(() => new Error('API Error')));

    const fixture = TestBed.createComponent(App);
    spyOn(console, 'error');
    fixture.detectChanges();
    tick();

    expect(fixture.componentInstance.loading).toBeFalse();
    expect(console.error).toHaveBeenCalled();
  }));

  it('should set loadingShopId when onGenerate is called', () => {
    const fixture = TestBed.createComponent(App);
    const shop = createMockShop({ id: '123' });

    fixture.componentInstance.onGenerate(shop);

    expect(fixture.componentInstance.loadingShopId).toBe('123');
  });

  it('should log when onAdd is called', () => {
    const fixture = TestBed.createComponent(App);
    const shop = createMockShop({ label: 'Test Shop' });
    spyOn(console, 'log');

    fixture.componentInstance.onAdd(shop);

    expect(console.log).toHaveBeenCalledWith('Add:', 'Test Shop');
  });
});
