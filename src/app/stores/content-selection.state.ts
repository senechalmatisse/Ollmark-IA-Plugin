import {ShopAttribute} from '../models/shop-attribute.model';

export interface ContentSelection {
  selectedAttributes: ReadonlySet<ShopAttribute>;
  selectedPhotoIds: ReadonlySet<string>;
}

export function createContentSelection(): ContentSelection {
  return {
    selectedAttributes: new Set<ShopAttribute>(),
    selectedPhotoIds: new Set<string>(),
  };
}

export function toggleAttribute(
  state: ContentSelection,
  attribute: ShopAttribute
): ContentSelection {
  const next = new Set(state.selectedAttributes);
  
  if (next.has(attribute)) {
    next.delete(attribute);
  } else {
    next.add(attribute);
  }
  
  return {...state, selectedAttributes: next};
}

export function togglePhoto(state: ContentSelection, photoId: string): ContentSelection {
  const next = new Set(state.selectedPhotoIds);
  
  if (next.has(photoId)) {
    next.delete(photoId);
  } else {
    next.add(photoId);
  }
  
  return {...state, selectedPhotoIds: next};
}

export function clearContentSelection(): ContentSelection {
  return createContentSelection();
}

export function isAttributeSelected(state: ContentSelection, attribute: ShopAttribute): boolean {
  return state.selectedAttributes.has(attribute);
}

export function isPhotoSelected(state: ContentSelection, photoId: string): boolean {
  return state.selectedPhotoIds.has(photoId);
}

export function hasAnySelection(state: ContentSelection): boolean {
  return state.selectedAttributes.size > 0 || state.selectedPhotoIds.size > 0;
}