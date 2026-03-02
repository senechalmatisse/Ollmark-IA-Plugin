import { mapShopFromDto, mapCategoryFromDto, GeoLocatedShopDto, CategoryDto } from './shop.mapper';

describe('ShopMapper', () => {
  describe('toDomain / mapShopFromDto', () => {
    it('should map a complete shop DTO to domain', () => {
      const dto: GeoLocatedShopDto = {
        distance: 100,
        entity: {
          id: 'shop-1',
          label: 'Boulangerie Parisienne',
          address: {
            street: '123 Rue du Pain',
            city: 'Paris',
            zipCode: '75001',
            country: 'France',
            complement: 'Étage 2',
            phone: '0123456789',
            geolocation: { coordinates: [2.3522, 48.8566] }
          },
          urls: ['https://ollca.com/shop', 'https://api.ollca.com/shop/1'],
          logo: { id: 'logo-1', url: 'https://example.com/logo.jpg' },
          photos: [
            { id: 'photo-1', url: 'https://example.com/photo1.jpg' },
            { id: 'photo-2', url: 'https://example.com/photo2.jpg' }
          ],
          primaryCategory: { id: 'cat-1', label: 'Boulangerie' }
        }
      };

      const result = mapShopFromDto(dto);

      expect(result.id).toBe('shop-1');
      expect(result.label).toBe('Boulangerie Parisienne');
      expect(result.address.street).toBe('123 Rue du Pain');
      expect(result.address.city).toBe('Paris');
      expect(result.address.zipCode).toBe('75001');
      expect(result.address.country).toBe('France');
      expect(result.address.complement).toBe('Étage 2');
      expect(result.address.phone).toBe('0123456789');
      expect(result.address.formatted).toBe('123 Rue du Pain, 75001 Paris');
      expect(result.humanUrl).toBe('ollca.com/paris/boutiques/boulangerie-parisienne');
      expect(result.technicalUrl).toBe('https://api.ollca.com/shop/1');
      expect(result.logo?.url).toBe('https://example.com/logo.jpg');
      expect(result.photos.length).toBe(2);
      expect(result.primaryCategory?.label).toBe('Boulangerie');
      expect(result.geolocation?.latitude).toBe(48.8566);
      expect(result.geolocation?.longitude).toBe(2.3522);
    });

    it('should handle missing optional fields', () => {
      const dto: GeoLocatedShopDto = {
        entity: {
          id: 'shop-2'
        }
      };

      const result = mapShopFromDto(dto);

      expect(result.id).toBe('shop-2');
      expect(result.label).toBe('Sans nom');
      expect(result.address.street).toBe('');
      expect(result.address.city).toBe('');
      expect(result.address.formatted).toBe('');
      expect(result.logo).toBeNull();
      expect(result.photos.length).toBe(0);
      expect(result.primaryCategory).toBeNull();
      expect(result.geolocation).toBeNull();
    });

    it('should generate human URL from city and label', () => {
      const dto: GeoLocatedShopDto = {
        entity: {
          id: 'shop-3',
          label: 'Café de l\'Étoile',
          address: { city: 'Lyon' }
        }
      };

      const result = mapShopFromDto(dto);

      expect(result.humanUrl).toBe('ollca.com/lyon/boutiques/cafe-de-l-etoile');
    });

    it('should return empty human URL if no city or label', () => {
      const dto: GeoLocatedShopDto = {
        entity: { id: 'shop-4' }
      };

      const result = mapShopFromDto(dto);

      expect(result.humanUrl).toBe('');
    });
  });

  describe('mapCategoryFromDto', () => {
    it('should map category DTO', () => {
      const dto: CategoryDto = { id: 'cat-1', label: 'Boulangerie' };

      const result = mapCategoryFromDto(dto);

      expect(result.id).toBe('cat-1');
      expect(result.label).toBe('Boulangerie');
    });
  });
});
