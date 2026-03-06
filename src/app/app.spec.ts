import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {App} from './app';
import {ShopApiService} from './core/http/shop-api.service';
import {of} from 'rxjs';
import {Shop, ShopAddress, ShopCategory} from './models/shop.model';
import {Paginated} from './models/pagination.model';
import {provideRouter} from '@angular/router';

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
    logo: {id: 'logo1', url: 'https://example.com/logo.jpg'},
    photos: [],
    primaryCategory: {id: 'cat1', label: 'Boulangerie'},
    geolocation: {latitude: 48.8566, longitude: 2.3522},
    ...overrides
  };
}

describe('App', () => {
  let mockShopApiService: jasmine.SpyObj<ShopApiService>;
  const mockShops: Shop[] = [
    createMockShop({id: '1', label: 'Boutique 1'}),
    createMockShop({id: '2', label: 'Boutique 2'})
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
    {id: 'cat1', label: 'Boulangerie'}
  ];

  beforeEach(async () => {
    mockShopApiService = jasmine.createSpyObj('ShopApiService', ['search', 'getCategories', 'searchCategories', 'getMarketplaces']);
    mockShopApiService.search.and.returnValue(of(mockPaginatedResponse));
    mockShopApiService.getCategories.and.returnValue(of(mockCategories));
    mockShopApiService.getMarketplaces.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {provide: ShopApiService, useValue: mockShopApiService}
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

  it('should render ShopViewComponent', fakeAsync(() => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    tick();
    console.log(fixture.nativeElement)
    const shopView = fixture.nativeElement.querySelector('router-outlet');
    expect(shopView).toBeTruthy();
  }));
});
