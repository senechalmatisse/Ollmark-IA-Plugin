import {TestBed} from '@angular/core/testing';
import {ContentSelectionStore} from './content-selection.store';

describe('ContentSelectionStore', () => {
  let store: ContentSelectionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    store = TestBed.inject(ContentSelectionStore);
  });

  describe('initial state', () => {
    it('should have no selected attributes', () => {
      expect(store.selectedAttributes().size).toBe(0);
    });

    it('should have no selected photos', () => {
      expect(store.selectedPhotoIds().size).toBe(0);
    });

    it('should have no selection', () => {
      expect(store.hasSelection()).toBeFalse();
    });

    it('should have selection count of 0', () => {
      expect(store.selectionCount()).toBe(0);
    });
  });

  describe('toggleAttribute', () => {
    it('should select an attribute', () => {
      store.toggleAttribute('label');
      expect(store.isAttributeSelected('label')).toBeTrue();
    });

    it('should deselect an attribute when toggled twice', () => {
      store.toggleAttribute('label');
      store.toggleAttribute('label');
      expect(store.isAttributeSelected('label')).toBeFalse();
    });

    it('should update hasSelection', () => {
      store.toggleAttribute('label');
      expect(store.hasSelection()).toBeTrue();
    });

    it('should update selectionCount', () => {
      store.toggleAttribute('label');
      store.toggleAttribute('address');
      expect(store.selectionCount()).toBe(2);
    });
  });

  describe('togglePhoto', () => {
    it('should select a photo', () => {
      store.togglePhoto('p1');
      expect(store.isPhotoSelected('p1')).toBeTrue();
    });

    it('should deselect a photo when toggled twice', () => {
      store.togglePhoto('p1');
      store.togglePhoto('p1');
      expect(store.isPhotoSelected('p1')).toBeFalse();
    });

    it('should update hasSelection', () => {
      store.togglePhoto('p1');
      expect(store.hasSelection()).toBeTrue();
    });
  });

  describe('clearSelection', () => {
    it('should clear all attributes and photos', () => {
      store.toggleAttribute('label');
      store.togglePhoto('p1');
      store.clearSelection();
      expect(store.hasSelection()).toBeFalse();
      expect(store.selectionCount()).toBe(0);
    });
  });
});