import {
  createContentSelection,
  toggleAttribute,
  togglePhoto,
  clearContentSelection,
  isAttributeSelected,
  isPhotoSelected,
  hasAnySelection,
} from './content-selection.state';

describe('ContentSelectionState', () => {

  describe('createContentSelection', () => {
    it('should create an empty selection', () => {
      const state = createContentSelection();
      expect(state.selectedAttributes.size).toBe(0);
      expect(state.selectedPhotoIds.size).toBe(0);
    });
  });

  describe('toggleAttribute', () => {
    it('should add an attribute when not selected', () => {
      const state = createContentSelection();
      const next = toggleAttribute(state, 'label');
      expect(next.selectedAttributes.has('label')).toBeTrue();
    });

    it('should remove an attribute when already selected', () => {
      let state = createContentSelection();
      state = toggleAttribute(state, 'label');
      state = toggleAttribute(state, 'label');
      expect(state.selectedAttributes.has('label')).toBeFalse();
    });

    it('should not affect other attributes', () => {
      let state = createContentSelection();
      state = toggleAttribute(state, 'label');
      state = toggleAttribute(state, 'address');
      expect(state.selectedAttributes.has('label')).toBeTrue();
      expect(state.selectedAttributes.has('address')).toBeTrue();
    });

    it('should return a new state object', () => {
      const state = createContentSelection();
      const next = toggleAttribute(state, 'label');
      expect(next).not.toBe(state);
    });
  });

  describe('togglePhoto', () => {
    it('should add a photo when not selected', () => {
      const state = createContentSelection();
      const next = togglePhoto(state, 'p1');
      expect(next.selectedPhotoIds.has('p1')).toBeTrue();
    });

    it('should remove a photo when already selected', () => {
      let state = createContentSelection();
      state = togglePhoto(state, 'p1');
      state = togglePhoto(state, 'p1');
      expect(state.selectedPhotoIds.has('p1')).toBeFalse();
    });

    it('should not affect other photos', () => {
      let state = createContentSelection();
      state = togglePhoto(state, 'p1');
      state = togglePhoto(state, 'p2');
      expect(state.selectedPhotoIds.has('p1')).toBeTrue();
      expect(state.selectedPhotoIds.has('p2')).toBeTrue();
    });
  });

  describe('clearContentSelection', () => {
    it('should return an empty selection', () => {
      const cleared = clearContentSelection();
      expect(cleared.selectedAttributes.size).toBe(0);
      expect(cleared.selectedPhotoIds.size).toBe(0);
    });
  });

  describe('isAttributeSelected', () => {
    it('should return true when attribute is selected', () => {
      let state = createContentSelection();
      state = toggleAttribute(state, 'label');
      expect(isAttributeSelected(state, 'label')).toBeTrue();
    });

    it('should return false when attribute is not selected', () => {
      const state = createContentSelection();
      expect(isAttributeSelected(state, 'label')).toBeFalse();
    });
  });

  describe('isPhotoSelected', () => {
    it('should return true when photo is selected', () => {
      let state = createContentSelection();
      state = togglePhoto(state, 'p1');
      expect(isPhotoSelected(state, 'p1')).toBeTrue();
    });

    it('should return false when photo is not selected', () => {
      const state = createContentSelection();
      expect(isPhotoSelected(state, 'p1')).toBeFalse();
    });
  });

  describe('hasAnySelection', () => {
    it('should return false when nothing is selected', () => {
      const state = createContentSelection();
      expect(hasAnySelection(state)).toBeFalse();
    });

    it('should return true when an attribute is selected', () => {
      let state = createContentSelection();
      state = toggleAttribute(state, 'label');
      expect(hasAnySelection(state)).toBeTrue();
    });

    it('should return true when a photo is selected', () => {
      let state = createContentSelection();
      state = togglePhoto(state, 'p1');
      expect(hasAnySelection(state)).toBeTrue();
    });
  });
});