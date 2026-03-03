import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { ShopApiService } from './shop-api.service';
import { createDefaultShopFilters, createDefaultCategoryFilters } from '../../models/shop.model';

describe('ShopApiService', () => {
  let service: ShopApiService;
  let httpMock: HttpTestingController;

  const mockApiResponse = {
    content: [
      {
        distance: 0,
        entity: {
          id: '1',
          label: 'Boulangerie Test',
          address: {
            street: '123 Rue du Pain',
            city: 'Paris',
            zipCode: '75001',
            country: 'France'
          },
          logo: { id: 'logo1', url: 'https://example.com/logo.jpg' },
          photos: [],
          primaryCategory: { id: 'cat1', label: 'Boulangerie' }
        }
      }
    ],
    totalElements: 1,
    totalPages: 1,
    size: 20,
    number: 0,
    last: true
  };

  const mockCategoryResponse = {
    content: [
      { id: 'cat1', label: 'Boulangerie' },
      { id: 'cat2', label: 'Restaurant' }
    ],
    totalElements: 2,
    totalPages: 1,
    size: 20,
    number: 0,
    last: true
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        ShopApiService
      ]
    });

    service = TestBed.inject(ShopApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('search', () => {
    it('should search shops with default filters', () => {
      const filters = createDefaultShopFilters();

      service.search(filters).subscribe(result => {
        expect(result.content.length).toBe(1);
        expect(result.content[0].label).toBe('Boulangerie Test');
        expect(result.number).toBe(1); // Should be incremented by 1
      });

      const req = httpMock.expectOne(r =>
        r.url === '/shop-api/v2/public/shop' &&
        r.params.get('page') === '1' &&
        r.params.get('size') === '20' &&
        r.params.get('onlineOnly') === 'true'
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockApiResponse);
    });

    it('should search shops with query parameter', () => {
      const filters = { ...createDefaultShopFilters(), q: 'boulangerie' };

      service.search(filters).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === '/shop-api/v2/public/shop' &&
        r.params.get('q') === 'boulangerie'
      );
      req.flush(mockApiResponse);
    });

    it('should search shops with category filter', () => {
      const filters = { ...createDefaultShopFilters(), category: ['cat1', 'cat2'] };

      service.search(filters).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === '/shop-api/v2/public/shop' &&
        r.params.get('category') === 'cat1,cat2'
      );
      req.flush(mockApiResponse);
    });

    it('should search shops with sort parameter', () => {
      const filters = { ...createDefaultShopFilters(), sort: ['-score', '-creationDate'] };

      service.search(filters).subscribe();

      const req = httpMock.expectOne(r => {
        const sortParams = r.params.getAll('sort');
        return r.url === '/shop-api/v2/public/shop' &&
          sortParams !== null &&
          sortParams.includes('-score') &&
          sortParams.includes('-creationDate');
      });
      req.flush(mockApiResponse);
    });

    it('should search shops with single sort parameter', () => {
      const filters = { ...createDefaultShopFilters(), sort: ['-creationDate'] };

      service.search(filters).subscribe();

      const req = httpMock.expectOne(r => {
        const sortParams = r.params.getAll('sort');
        return r.url === '/shop-api/v2/public/shop' &&
          sortParams !== null &&
          sortParams.length === 1 &&
          r.params.get('sort') === '-creationDate';
      });
      req.flush(mockApiResponse);
    });

    it('should search shops with query and sort for relevance', () => {
      const filters = { ...createDefaultShopFilters(), q: 'homard', sort: ['-score', '-creationDate'] };

      service.search(filters).subscribe();

      const req = httpMock.expectOne(r => {
        const sortParams = r.params.getAll('sort');
        return r.url === '/shop-api/v2/public/shop' &&
          r.params.get('q') === 'homard' &&
          (sortParams?.includes('-score') ?? false);
      });
      req.flush(mockApiResponse);
    });
  });

  describe('getCategories', () => {
    it('should get all categories', () => {
      service.getCategories().subscribe(categories => {
        expect(categories.length).toBe(2);
        expect(categories[0].label).toBe('Boulangerie');
        expect(categories[1].label).toBe('Restaurant');
      });

      const req = httpMock.expectOne('/shop-api/v2/public/category');
      expect(req.request.method).toBe('GET');
      req.flush(mockCategoryResponse);
    });

    it('should handle empty categories', () => {
      service.getCategories().subscribe(categories => {
        expect(categories.length).toBe(0);
      });

      const req = httpMock.expectOne('/shop-api/v2/public/category');
      req.flush({ content: [] });
    });
  });

  describe('searchCategories', () => {
    it('should search categories with filters', () => {
      const filters = createDefaultCategoryFilters();

      service.searchCategories(filters).subscribe(result => {
        expect(result.content.length).toBe(2);
        expect(result.totalElements).toBe(2);
      });

      const req = httpMock.expectOne(r =>
        r.url === '/shop-api/v2/public/category' &&
        r.params.get('page') === '1' &&
        r.params.get('size') === '20'
      );
      req.flush(mockCategoryResponse);
    });

    it('should search categories with query', () => {
      const filters = { ...createDefaultCategoryFilters(), q: 'bou' };

      service.searchCategories(filters).subscribe();

      const req = httpMock.expectOne(r =>
        r.url === '/shop-api/v2/public/category' &&
        r.params.get('q') === 'bou'
      );
      req.flush(mockCategoryResponse);
    });
  });
});
