import {TestBed} from '@angular/core/testing';
import {ShopSelectionService} from './shop-selection.service';
import {ContentSelectionStore} from '../../stores/content-selection.store';
import {ShopSelectionStore} from '../../stores/shop-selection.store';
import {ToastService} from '../toast/toast.service';
import {Shop} from '../../models/shop.model';

const mockShop: Shop = {
  id: '1',
  label: 'Boucherie Saint Clement',
  address: {
    street: '96 Rue Louis Blanc', city: 'Rouen', zipCode: '76100',
    country: 'FR', complement: null, phone: null,
    formatted: '96 Rue Louis Blanc, 76100 Rouen',
  },
  humanUrl: 'ollca.com/rouen/boutiques/boucherie-saint-clement',
  technicalUrl: null, eligibilityUrl: null, logo: null,
  photos: [
    {id: 'p1', url: 'https://picsum.photos/seed/1/90/70'},
    {id: 'p2', url: 'https://picsum.photos/seed/2/90/70'},
  ],
  primaryCategory: {id: 'c1', label: 'Boucherie'},
  geolocation: null,
};

const mockToastService = {
  showWait: jasmine.createSpy('showWait'),
  showSuccess: jasmine.createSpy('showSuccess'),
};

describe('ShopSelectionService', () => {
  let service: ShopSelectionService;
  let contentStore: ContentSelectionStore;
  let shopStore: ShopSelectionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{provide: ToastService, useValue: mockToastService}],
    });
    service = TestBed.inject(ShopSelectionService);
    contentStore = TestBed.inject(ContentSelectionStore);
    shopStore = TestBed.inject(ShopSelectionStore);
    mockToastService.showWait.calls.reset();
    mockToastService.showSuccess.calls.reset();
  });

  afterEach(() => {
    shopStore.clearEntries();
    contentStore.clearSelection();
  });


  describe('importSelectedFields', () => {
    it('should save entry with selected attributes in shopStore', () => {
      contentStore.toggleAttribute('label');
      contentStore.toggleAttribute('address');
      service.importSelectedFields(mockShop);
      expect(shopStore.hasEntries()).toBeTrue();
      expect(shopStore.entries()[0].selectedAttributes).toContain('label');
      expect(shopStore.entries()[0].selectedAttributes).toContain('address');
    });

    it('should not include photos attribute in selectedAttributes', () => {
      contentStore.toggleAttribute('photos');
      contentStore.togglePhoto('p1');
      service.importSelectedFields(mockShop);
      expect(shopStore.entries()[0].selectedAttributes).not.toContain('photos');
    });

    it('should save only selected photos', () => {
      contentStore.togglePhoto('p1');
      service.importSelectedFields(mockShop);
      const saved = shopStore.entries()[0].selectedPhotos;
      expect(saved.length).toBe(1);
      expect(saved[0].id).toBe('p1');
    });

    it('should not save unselected photos', () => {
      contentStore.togglePhoto('p1');
      service.importSelectedFields(mockShop);
      expect(shopStore.entries()[0].selectedPhotos.some(p => p.id === 'p2')).toBeFalse();
    });

    it('should save empty photos when none selected', () => {
      contentStore.toggleAttribute('label');
      service.importSelectedFields(mockShop);
      expect(shopStore.entries()[0].selectedPhotos.length).toBe(0);
    });

    it('should clear content store after import', () => {
      contentStore.toggleAttribute('label');
      contentStore.togglePhoto('p1');
      service.importSelectedFields(mockShop);
      expect(contentStore.hasSelection()).toBeFalse();
    });

    it('should update existing entry when same shop imported twice', () => {
      contentStore.toggleAttribute('label');
      service.importSelectedFields(mockShop);
      contentStore.toggleAttribute('address');
      service.importSelectedFields(mockShop);
      expect(shopStore.count()).toBe(1);
      expect(shopStore.entries()[0].selectedAttributes).toContain('address');
    });

    it('should save shop reference in entry', () => {
      contentStore.toggleAttribute('label');
      service.importSelectedFields(mockShop);
      expect(shopStore.entries()[0].shop.id).toBe('1');
      expect(shopStore.entries()[0].shop.label).toBe('Boucherie Saint Clement');
    });
  });


  describe('quickImport', () => {
    it('should call toastService.showWait', () => {
      contentStore.toggleAttribute('label');
      service.quickImport(mockShop);
      expect(mockToastService.showWait).toHaveBeenCalled();
    });

    it('should clear content store', () => {
      contentStore.toggleAttribute('label');
      service.quickImport(mockShop);
      expect(contentStore.hasSelection()).toBeFalse();
    });

    it('should send message to parent with label when selected', () => {
      spyOn(parent, 'postMessage');
      contentStore.toggleAttribute('label');
      service.quickImport(mockShop);
      expect(parent.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          type: 'quick-import-direct',
          data: jasmine.objectContaining({shopLabel: 'Boucherie Saint Clement'}),
        }),
        jasmine.any(String)
      );
    });

    it('should send null label when label not selected', () => {
      spyOn(parent, 'postMessage');
      service.quickImport(mockShop);
      expect(parent.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          data: jasmine.objectContaining({shopLabel: null}),
        }),
        jasmine.any(String)
      );
    });

    it('should send selected photos urls', () => {
      spyOn(parent, 'postMessage');
      contentStore.togglePhoto('p1');
      service.quickImport(mockShop);
      expect(parent.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            photos: ['https://picsum.photos/seed/1/90/70'],
          }),
        }),
        jasmine.any(String)
      );
    });

    it('should send empty photos when none selected', () => {
      spyOn(parent, 'postMessage');
      service.quickImport(mockShop);
      expect(parent.postMessage).toHaveBeenCalledWith(
        jasmine.objectContaining({
          data: jasmine.objectContaining({photos: []}),
        }),
        jasmine.any(String)
      );
    });
  });
});