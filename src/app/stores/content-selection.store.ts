import {Injectable, signal, computed} from '@angular/core';
import {ShopAttribute} from '../models/shop-attribute.model';
import {
  ContentSelection,
  createContentSelection,
  toggleAttribute,
  togglePhoto,
  clearContentSelection,
  isAttributeSelected,
  isPhotoSelected,
  hasAnySelection,
} from './content-selection.state';

@Injectable({
  providedIn: 'root',
})
export class ContentSelectionStore {
  private readonly _state = signal<ContentSelection>(createContentSelection());

  readonly selectedAttributes = computed(() => this._state().selectedAttributes);
  readonly selectedPhotoIds = computed(() => this._state().selectedPhotoIds);
  readonly hasSelection = computed(() => hasAnySelection(this._state()));
  readonly selectionCount = computed(
    () => this._state().selectedAttributes.size + this._state().selectedPhotoIds.size
  );

  isAttributeSelected(attribute: ShopAttribute): boolean {
    return isAttributeSelected(this._state(), attribute);
  }

  isPhotoSelected(photoId: string): boolean {
    return isPhotoSelected(this._state(), photoId);
  }

  toggleAttribute(attribute: ShopAttribute): void {
    this._state.update((state) => toggleAttribute(state, attribute));
  }

  togglePhoto(photoId: string): void {
    this._state.update((state) => togglePhoto(state, photoId));
  }

  clearSelection(): void {
    this._state.set(clearContentSelection());
  }
}