export type ShopAttribute =
  | 'label'
  | 'address'
  | 'humanUrl'
  | 'primaryCategory'
  | 'photos';

export const SHOP_ATTRIBUTE_LABELS: Record<ShopAttribute, string> = {
  label: 'Nom',
  address: 'Adresse',
  humanUrl: 'Adresse web humaine',
  primaryCategory: 'Catégorie principale',
  photos: 'Images',
};

export const SHOP_ATTRIBUTES: ShopAttribute[] = [
  'label',
  'address',
  'humanUrl',
  'primaryCategory',
  'photos',
];