import { Shop, ShopAddress, ShopCategory, ShopMedia, ShopGeoPoint } from '../../models/shop.model';

/**
 * DTOs correspondant à la réponse JSON de l'API Ollca
 */
interface MediaDto {
  id: string;
  url: string;
}

export interface CategoryDto {
  id: string;
  label: string;
}

interface AddressDto {
  street?: string;
  city?: string;
  zipCode?: string;
  country?: string;
  complement?: string;
  phone?: string;
  geolocation?: { coordinates: [number, number] };
}

export interface ShopReadingDto {
  id: string;
  label?: string;
  address?: AddressDto;
  urls?: string[];
  logo?: MediaDto;
  photos?: MediaDto[];
  primaryCategory?: CategoryDto;
}

export interface GeoLocatedShopDto {
  distance?: number;
  entity: ShopReadingDto;
}

export class ShopMapper {
  /**
   * Mappe un élément du tableau "content" vers le domaine
   */
  static toDomain(item: GeoLocatedShopDto): Shop {
    const dto = item.entity;
    const citySlug = slugify(dto.address?.city || '');
    const shopSlug = slugify(dto.label || '');
    const generatedHumanUrl = (citySlug && shopSlug)
      ? `ollca.com/${citySlug}/boutiques/${shopSlug}`
      : '';

    return {
      id: dto.id,
      label: dto.label || 'Sans nom',
      address: mapAddress(dto.address),
      humanUrl: generatedHumanUrl,
      technicalUrl: dto.urls?.[1] ?? null,
      eligibilityUrl: dto.urls?.[2] ?? null,
      logo: mapMedia(dto.logo),
      photos: (dto.photos ?? []).map(mapMediaRequired),
      primaryCategory: mapCategory(dto.primaryCategory),
      geolocation: mapGeoPoint(dto.address?.geolocation)
    };
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function mapAddress(dto?: AddressDto): ShopAddress {
  const street = dto?.street ?? '';
  const city = dto?.city ?? '';
  const zipCode = dto?.zipCode ?? '';
  const location = [zipCode, city].filter(Boolean).join(' ');
  const formatted = [street, location].filter(Boolean).join(', ');

  return {
    street,
    city,
    zipCode,
    country: dto?.country ?? '',
    complement: dto?.complement ?? null,
    phone: dto?.phone ?? null,
    formatted
  };
}

function mapMedia(dto?: MediaDto): ShopMedia | null {
  return dto ? { id: dto.id, url: dto.url } : null;
}

function mapMediaRequired(dto: MediaDto): ShopMedia {
  return { id: dto.id, url: dto.url };
}

function mapCategory(dto?: CategoryDto): ShopCategory | null {
  return dto ? { id: dto.id, label: dto.label } : null;
}

function mapGeoPoint(geo?: { coordinates: [number, number] }): ShopGeoPoint | null {
  if (!geo || !geo.coordinates) return null;
  return {
    longitude: geo.coordinates[0],
    latitude: geo.coordinates[1]
  };
}

export const mapShopFromDto = (item: GeoLocatedShopDto): Shop => ShopMapper.toDomain(item);

export function mapCategoryFromDto(dto: CategoryDto): ShopCategory {
  return {
    id: dto.id,
    label: dto.label
  };
}
