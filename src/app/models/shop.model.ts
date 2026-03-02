export interface Shop {
  id: string;
  label: string;
  address: ShopAddress;
  humanUrl: string | null;
  technicalUrl: string | null;
  eligibilityUrl: string | null;
  logo: ShopMedia | null;
  photos: ShopMedia[];
  primaryCategory: ShopCategory | null;
  geolocation: ShopGeoPoint | null;
}

export interface ShopAddress {
  street: string;
  city: string;
  zipCode: string;
  country: string;
  complement: string | null;
  phone: string | null;
  formatted: string;
}

export interface ShopMedia {
  id: string;
  url: string;
}

export interface ShopCategory {
  id: string;
  label: string;
}

export interface ShopGeoPoint {
  latitude: number;
  longitude: number;
}

export interface ShopFilters {
  q?: string;
  category?: string[];
  page: number;
  size: number;
}

export function createDefaultShopFilters(): ShopFilters {
  return { page: 1, size: 20 };
}

export interface CategoryFilters {
  q?: string;
  page: number;
  size: number;
}

export function createDefaultCategoryFilters(): CategoryFilters {
  return { page: 1, size: 20 };
}
