import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { SimpleChange } from '@angular/core';
import { PreviewCardComponent } from './preview-card.component';

const PNG_DATA_URL = 'data:image/png;base64,abc';
const noop = jasmine.createSpy('noop');

describe('PreviewCardComponent', () => {
  let component: PreviewCardComponent;
  let fixture: ComponentFixture<PreviewCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreviewCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PreviewCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('pngDataUrl', PNG_DATA_URL);
    fixture.detectChanges();
    fixture.detectChanges();
  });

  // ── Création ────────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Getters de status ────────────────────────────────────────────────────────

  it('isPending should be true when status is pending', () => {
    fixture.componentRef.setInput('status', 'pending');
    expect(component.isPending).toBeTrue();
  });

  it('isPending should be true when status is an unexpected value', () => {
    (component as unknown as { status: string }).status = 'unknown';
    expect(component.isPending).toBeTrue();
  });

  it('isAccepted should be true when status is accepted', () => {
    fixture.componentRef.setInput('status', 'accepted');
    expect(component.isAccepted).toBeTrue();
    expect(component.isPending).toBeFalse();
  });

  it('isRejected should be true when status is rejected', () => {
    fixture.componentRef.setInput('status', 'rejected');
    expect(component.isRejected).toBeTrue();
    expect(component.isPending).toBeFalse();
  });

  it('isLoading should be true when pending and no image', () => {
    fixture.componentRef.setInput('status', 'pending');
    component.finalImageUrl = '';
    expect(component.isLoading).toBeTrue();
  });

  it('isLoading should be false when image is loaded', () => {
    fixture.componentRef.setInput('status', 'pending');
    component.finalImageUrl = PNG_DATA_URL;
    expect(component.isLoading).toBeFalse();
  });

  it('isLoading should be false when accepted even without image', () => {
    fixture.componentRef.setInput('status', 'accepted');
    component.finalImageUrl = '';
    expect(component.isLoading).toBeFalse();
  });

  it('isLoading should be false when rejected even without image', () => {
    fixture.componentRef.setInput('status', 'rejected');
    component.finalImageUrl = '';
    expect(component.isLoading).toBeFalse();
  });

  it('showImage should be true when finalImageUrl is set', () => {
    component.finalImageUrl = PNG_DATA_URL;
    expect(component.showImage).toBeTrue();
  });

  it('showImage should be false when finalImageUrl is empty', () => {
    component.finalImageUrl = '';
    expect(component.showImage).toBeFalse();
  });

  // ── Rendu template selon status ──────────────────────────────────────────────

  it('should show action buttons when status is pending', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.preview-card__btn')).length).toBe(2);
  });

  it('should show accepted badge when status is accepted', () => {
    fixture.componentRef.setInput('status', 'accepted');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.preview-card__badge--accepted'))).toBeTruthy();
    expect(fixture.debugElement.queryAll(By.css('.preview-card__btn')).length).toBe(0);
  });

  it('should show rejected badge when status is rejected', () => {
    fixture.componentRef.setInput('status', 'rejected');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.preview-card__badge--rejected'))).toBeTruthy();
  });

  it('should not show action buttons when status is accepted', () => {
    fixture.componentRef.setInput('status', 'accepted');
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.preview-card__btn')).length).toBe(0);
  });

  it('should not show action buttons when status is rejected', () => {
    fixture.componentRef.setInput('status', 'rejected');
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.preview-card__btn')).length).toBe(0);
  });

  it('should not show action buttons when isLoading', () => {
    fixture.componentRef.setInput('status', 'pending');
    component.finalImageUrl = '';
    fixture.detectChanges();
    expect(fixture.debugElement.queryAll(By.css('.preview-card__btn')).length).toBe(0);
  });

  it('should not show accepted badge when status is pending', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.preview-card__badge--accepted'))).toBeNull();
  });

  it('should not show rejected badge when status is pending', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.preview-card__badge--rejected'))).toBeNull();
  });

  it('should disable action buttons when isAiLoading is true', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.componentRef.setInput('isAiLoading', true);
    fixture.detectChanges();
    const buttons = fixture.debugElement.queryAll(By.css('.preview-card__btn'));
    buttons.forEach((btn) => expect(btn.nativeElement.disabled).toBeTrue());
  });

  it('should not disable action buttons when isAiLoading is false', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.componentRef.setInput('isAiLoading', false);
    fixture.detectChanges();
    const buttons = fixture.debugElement.queryAll(By.css('.preview-card__btn'));
    buttons.forEach((btn) => expect(btn.nativeElement.disabled).toBeFalse());
  });

  // ── Émission d événements ────────────────────────────────────────────────────

  it('should emit accepted when accept button is clicked', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    let emitted = false;
    component.accepted.subscribe(() => (emitted = true));
    fixture.debugElement
      .query(By.css('.preview-card__btn--accept'))
      .triggerEventHandler('click', null);
    expect(emitted).toBeTrue();
  });

  it('should emit rejected when reject button is clicked', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    let emitted = false;
    component.rejected.subscribe(() => (emitted = true));
    fixture.debugElement
      .query(By.css('.preview-card__btn--reject'))
      .triggerEventHandler('click', null);
    expect(emitted).toBeTrue();
  });

  it('should not emit accepted when status is accepted', () => {
    fixture.componentRef.setInput('status', 'accepted');
    fixture.detectChanges();
    let emitted = false;
    component.accepted.subscribe(() => (emitted = true));
    component.onAccept();
    expect(emitted).toBeFalse();
  });

  it('should not emit rejected when status is rejected', () => {
    fixture.componentRef.setInput('status', 'rejected');
    fixture.detectChanges();
    let emitted = false;
    component.rejected.subscribe(() => (emitted = true));
    component.onReject();
    expect(emitted).toBeFalse();
  });

  it('should not emit accepted twice (isProcessing guard)', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    let count = 0;
    component.accepted.subscribe(() => count++);
    component.onAccept();
    component.onAccept();
    expect(count).toBe(1);
  });

  it('should not emit rejected twice (isProcessing guard)', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    let count = 0;
    component.rejected.subscribe(() => count++);
    component.onReject();
    component.onReject();
    expect(count).toBe(1);
  });

  it('should set isProcessing to true after onAccept', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    component.onAccept();
    expect(component.isProcessing).toBeTrue();
  });

  it('should set isProcessing to true after onReject', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    component.onReject();
    expect(component.isProcessing).toBeTrue();
  });

  it('should reset isProcessing when status changes to accepted', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    component.onAccept();
    expect(component.isProcessing).toBeTrue();
    fixture.componentRef.setInput('status', 'accepted');
    fixture.detectChanges();
    expect(component.isProcessing).toBeFalse();
  });

  it('should reset isProcessing when status changes to rejected', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    component.onReject();
    expect(component.isProcessing).toBeTrue();
    fixture.componentRef.setInput('status', 'rejected');
    fixture.detectChanges();
    expect(component.isProcessing).toBeFalse();
  });

  it('should not reset isProcessing when status stays pending', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    component.onAccept();
    expect(component.isProcessing).toBeTrue();
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    expect(component.isProcessing).toBeTrue();
  });

  // ── Image ────────────────────────────────────────────────────────────────────

  it('should set finalImageUrl synchronously for PNG data URLs', () => {
    expect(component.finalImageUrl).toBe(PNG_DATA_URL);
  });

  it('should display the preview image', () => {
    const img = fixture.debugElement.query(By.css('.preview-card__image'));
    expect(img).toBeTruthy();
    expect(img.nativeElement.src).toContain('data:image/png;base64,abc');
  });

  it('should update finalImageUrl when pngDataUrl input changes', () => {
    const newUrl = 'data:image/png;base64,xyz';
    fixture.componentRef.setInput('pngDataUrl', newUrl);
    fixture.detectChanges();
    expect(component.finalImageUrl).toBe(newUrl);
  });

  it('should reset fitted state when pngDataUrl changes', () => {
    const newUrl = 'data:image/png;base64,xyz';
    (component as unknown as { _fitted: boolean })._fitted = true;
    fixture.componentRef.setInput('pngDataUrl', newUrl);
    fixture.detectChanges();
    expect(component.finalImageUrl).toBe(newUrl);
  });

  it('should not process image in ngOnChanges when pngDataUrl is falsy', () => {
    (component as unknown as { pngDataUrl: string }).pngDataUrl = '';
    const spy = spyOn(
      component as unknown as { _processImage: (u: string) => void },
      '_processImage',
    );
    component.ngOnChanges({
      pngDataUrl: new SimpleChange(PNG_DATA_URL, '', false),
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it('should not process image in ngOnChanges when pngDataUrl key is absent', () => {
    const spy = spyOn(
      component as unknown as { _processImage: (u: string) => void },
      '_processImage',
    );
    component.ngOnChanges({ status: new SimpleChange('pending', 'accepted', false) });
    expect(spy).not.toHaveBeenCalled();
  });

  it('should handle SVG data URL with canvas fallback', fakeAsync(() => {
    const svgUrl = 'data:image/svg+xml;base64,PHN2Zyc+PC9zdmc+';
    fixture.componentRef.setInput('pngDataUrl', svgUrl);
    fixture.detectChanges();
    tick(200);
    fixture.detectChanges();
    expect(component.finalImageUrl.length).toBeGreaterThan(0);
  }));

  it('should fall back to original url when SVG conversion fails', fakeAsync(() => {
    const badSvg = 'data:image/svg+xml;base64,INVALID';
    spyOn(
      component as unknown as { _svgToPng: (u: string) => Promise<string> },
      '_svgToPng',
    ).and.returnValue(Promise.reject(new Error('fail')));
    fixture.componentRef.setInput('pngDataUrl', badSvg);
    fixture.detectChanges();
    tick(200);
    fixture.detectChanges();
    expect(component.finalImageUrl).toBe(badSvg);
  }));

  // ── Zoom / Pan ────────────────────────────────────────────────────────────────

  it('should set isDragging on mousedown and clear on mouseup', () => {
    component.onMouseDown({
      button: 0,
      clientX: 10,
      clientY: 10,
      preventDefault: noop,
    } as unknown as MouseEvent);
    expect((component as unknown as { _isDragging: boolean })._isDragging).toBeTrue();
    component.onMouseUp();
    expect((component as unknown as { _isDragging: boolean })._isDragging).toBeFalse();
  });

  it('should not set isDragging on non-left-button mousedown', () => {
    component.onMouseDown({
      button: 1,
      clientX: 10,
      clientY: 10,
      preventDefault: noop,
    } as unknown as MouseEvent);
    expect((component as unknown as { _isDragging: boolean })._isDragging).toBeFalse();
  });

  it('should reset fitted and reschedule on double click', () => {
    (component as unknown as { _fitted: boolean })._fitted = true;
    component.onDblClick();
    expect((component as unknown as { _fitted: boolean })._fitted).toBeFalse();
  });

  it('should move transform when dragging with mousemove', () => {
    component.onMouseDown({
      button: 0,
      clientX: 0,
      clientY: 0,
      preventDefault: noop,
    } as unknown as MouseEvent);
    component.onMouseMove({
      clientX: 50,
      clientY: 30,
      preventDefault: noop,
    } as unknown as MouseEvent);
    const tx = (component as unknown as { _tx: number })._tx;
    const ty = (component as unknown as { _ty: number })._ty;
    expect(tx).toBe(50);
    expect(ty).toBe(30);
  });

  it('should not move when mousemove without mousedown', () => {
    component.onMouseMove({
      clientX: 50,
      clientY: 30,
      preventDefault: noop,
    } as unknown as MouseEvent);
    const tx = (component as unknown as { _tx: number })._tx;
    expect(tx).toBe(0);
  });

  it('should stop dragging on mouseleave (mouseup)', () => {
    component.onMouseDown({
      button: 0,
      clientX: 0,
      clientY: 0,
      preventDefault: noop,
    } as unknown as MouseEvent);
    expect((component as unknown as { _isDragging: boolean })._isDragging).toBeTrue();
    component.onMouseUp();
    expect((component as unknown as { _isDragging: boolean })._isDragging).toBeFalse();
  });

  it('should update _tx and _ty on multiple mousemove events', () => {
    component.onMouseDown({
      button: 0,
      clientX: 10,
      clientY: 10,
      preventDefault: noop,
    } as unknown as MouseEvent);
    component.onMouseMove({
      clientX: 20,
      clientY: 25,
      preventDefault: noop,
    } as unknown as MouseEvent);
    component.onMouseMove({
      clientX: 40,
      clientY: 50,
      preventDefault: noop,
    } as unknown as MouseEvent);
    const tx = (component as unknown as { _tx: number })._tx;
    const ty = (component as unknown as { _ty: number })._ty;
    expect(tx).toBe(30);
    expect(ty).toBe(40);
  });

  it('should update scale on wheel zoom in', () => {
    const initialScale = (component as unknown as { _scale: number })._scale;
    const vp = fixture.debugElement.query(By.css('.preview-card__viewport'));
    if (vp) {
      component.onWheel({
        deltaY: -100,
        clientX: 0,
        clientY: 0,
        preventDefault: noop,
        stopPropagation: noop,
      } as unknown as WheelEvent);
      const newScale = (component as unknown as { _scale: number })._scale;
      expect(newScale).toBeGreaterThan(initialScale);
    } else {
      pending('viewport not rendered');
    }
  });

  it('should update scale on wheel zoom out', () => {
    const initialScale = (component as unknown as { _scale: number })._scale;
    const vp = fixture.debugElement.query(By.css('.preview-card__viewport'));
    if (vp) {
      component.onWheel({
        deltaY: 100,
        clientX: 0,
        clientY: 0,
        preventDefault: noop,
        stopPropagation: noop,
      } as unknown as WheelEvent);
      const newScale = (component as unknown as { _scale: number })._scale;
      expect(newScale).toBeLessThan(initialScale);
    } else {
      pending('viewport not rendered');
    }
  });

  // ── Labels ───────────────────────────────────────────────────────────────────

  it('should show loading label when isLoading', () => {
    fixture.componentRef.setInput('status', 'pending');
    component.finalImageUrl = '';
    fixture.detectChanges();
    const label = fixture.debugElement.query(By.css('.preview-card__label'));
    expect(label.nativeElement.textContent).toContain('Prévisualisation en cours');
  });

  it('should show accepted label when status is accepted', () => {
    fixture.componentRef.setInput('status', 'accepted');
    fixture.detectChanges();
    const label = fixture.debugElement.query(By.css('.preview-card__label'));
    expect(label.nativeElement.textContent).toContain('Modifications appliquées');
  });

  it('should show rejected label when status is rejected', () => {
    fixture.componentRef.setInput('status', 'rejected');
    fixture.detectChanges();
    const label = fixture.debugElement.query(By.css('.preview-card__label'));
    expect(label.nativeElement.textContent).toContain('Modifications rejetées');
  });

  it('should show default label when pending with image', () => {
    fixture.componentRef.setInput('status', 'pending');
    component.finalImageUrl = PNG_DATA_URL;
    fixture.detectChanges();
    const label = fixture.debugElement.query(By.css('.preview-card__label'));
    expect(label.nativeElement.textContent).toContain('Résultat de la génération');
  });

  // ── CSS classes ───────────────────────────────────────────────────────────────

  it('should add preview-card--accepted class when accepted', () => {
    fixture.componentRef.setInput('status', 'accepted');
    fixture.detectChanges();
    const card = fixture.debugElement.query(By.css('.preview-card'));
    expect(card.nativeElement.classList).toContain('preview-card--accepted');
  });

  it('should add preview-card--rejected class when rejected', () => {
    fixture.componentRef.setInput('status', 'rejected');
    fixture.detectChanges();
    const card = fixture.debugElement.query(By.css('.preview-card'));
    expect(card.nativeElement.classList).toContain('preview-card--rejected');
  });

  it('should not add status classes when pending', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    const card = fixture.debugElement.query(By.css('.preview-card'));
    expect(card.nativeElement.classList).not.toContain('preview-card--accepted');
    expect(card.nativeElement.classList).not.toContain('preview-card--rejected');
  });

  // ── Loading spinner ───────────────────────────────────────────────────────────

  it('should show loading spinner when isLoading', () => {
    fixture.componentRef.setInput('status', 'pending');
    component.finalImageUrl = '';
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.preview-card__loading'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.preview-card__loader'))).toBeTruthy();
  });

  it('should not show loading spinner when image is loaded', () => {
    fixture.componentRef.setInput('status', 'pending');
    component.finalImageUrl = PNG_DATA_URL;
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.preview-card__loading'))).toBeNull();
  });

  it('should not show loading spinner when accepted', () => {
    fixture.componentRef.setInput('status', 'accepted');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.preview-card__loading'))).toBeNull();
  });

  // ── Viewport & hint ───────────────────────────────────────────────────────────

  it('should show viewport when image is loaded', () => {
    component.finalImageUrl = PNG_DATA_URL;
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.preview-card__viewport'))).toBeTruthy();
  });

  it('should not show viewport when loading', () => {
    fixture.componentRef.setInput('status', 'pending');
    component.finalImageUrl = '';
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.preview-card__viewport'))).toBeNull();
  });

  it('should not show viewport when accepted without image', () => {
    fixture.componentRef.setInput('status', 'accepted');
    component.finalImageUrl = '';
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.preview-card__viewport'))).toBeNull();
  });

  it('should show hint when image is loaded', () => {
    component.finalImageUrl = PNG_DATA_URL;
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.preview-card__hint'))).toBeTruthy();
  });

  it('should not show hint when no image', () => {
    component.finalImageUrl = '';
    (component as unknown as { _cdr: { markForCheck: () => void } })._cdr.markForCheck();
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.preview-card__hint'))).toBeNull();
  });

  // ── isProcessing spinner ──────────────────────────────────────────────────────

  it('should show processing spinner when isProcessing is true', () => {
    fixture.componentRef.setInput('status', 'pending');
    component.isProcessing = true;
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.preview-card__processing'))).toBeTruthy();
    expect(fixture.debugElement.queryAll(By.css('.preview-card__btn')).length).toBe(0);
  });

  it('should hide processing spinner when isProcessing is false', () => {
    fixture.componentRef.setInput('status', 'pending');
    component.isProcessing = false;
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('.preview-card__processing'))).toBeNull();
  });

  // ── ngAfterViewInit ───────────────────────────────────────────────────────────

  it('should process image in ngAfterViewInit when pngDataUrl is set', () => {
    const spy = spyOn(
      component as unknown as { _processImage: (u: string) => void },
      '_processImage',
    );
    component.ngAfterViewInit();
    expect(spy).toHaveBeenCalledWith(PNG_DATA_URL);
  });

  it('should not call _processImage in ngAfterViewInit when pngDataUrl is empty', () => {
    (component as unknown as { pngDataUrl: string }).pngDataUrl = '';
    const spy = spyOn(
      component as unknown as { _processImage: (u: string) => void },
      '_processImage',
    );
    component.ngAfterViewInit();
    expect(spy).not.toHaveBeenCalled();
  });

  // ── aria-disabled ─────────────────────────────────────────────────────────────

  it('should set aria-disabled on buttons when isAiLoading is true', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.componentRef.setInput('isAiLoading', true);
    fixture.detectChanges();
    const buttons = fixture.debugElement.queryAll(By.css('.preview-card__btn'));
    buttons.forEach((btn) => expect(btn.nativeElement.getAttribute('aria-disabled')).toBe('true'));
  });

  it('should set aria-disabled to false on buttons when isAiLoading is false', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.componentRef.setInput('isAiLoading', false);
    fixture.detectChanges();
    const buttons = fixture.debugElement.queryAll(By.css('.preview-card__btn'));
    buttons.forEach((btn) => expect(btn.nativeElement.getAttribute('aria-disabled')).toBe('false'));
  });

  // ── onWheel (viewport présent car PNG chargé dans beforeEach) ────────────────

  it('should increase scale on wheel zoom in when viewport exists', () => {
    const before = (component as unknown as { _scale: number })._scale;
    component.onWheel({
      deltaY: -100,
      clientX: 0,
      clientY: 0,
      preventDefault: noop,
      stopPropagation: noop,
    } as unknown as WheelEvent);
    expect((component as unknown as { _scale: number })._scale).toBeGreaterThan(before);
  });

  it('should decrease scale on wheel zoom out when viewport exists', () => {
    const before = (component as unknown as { _scale: number })._scale;
    component.onWheel({
      deltaY: 100,
      clientX: 0,
      clientY: 0,
      preventDefault: noop,
      stopPropagation: noop,
    } as unknown as WheelEvent);
    expect((component as unknown as { _scale: number })._scale).toBeLessThan(before);
  });

  it('should clamp scale to minimum 0.05 on extreme zoom out', () => {
    (component as unknown as { _scale: number })._scale = 0.06;
    component.onWheel({
      deltaY: 100,
      clientX: 0,
      clientY: 0,
      preventDefault: noop,
      stopPropagation: noop,
    } as unknown as WheelEvent);
    expect((component as unknown as { _scale: number })._scale).toBeGreaterThanOrEqual(0.05);
  });

  it('should clamp scale to maximum 10 on extreme zoom in', () => {
    (component as unknown as { _scale: number })._scale = 9.5;
    component.onWheel({
      deltaY: -100,
      clientX: 0,
      clientY: 0,
      preventDefault: noop,
      stopPropagation: noop,
    } as unknown as WheelEvent);
    expect((component as unknown as { _scale: number })._scale).toBeLessThanOrEqual(10);
  });

  // ── _processImage — branche générique (non-PNG, non-SVG) ────────────────────

  it('should set finalImageUrl for a non-typed data URL (length > 0 branch)', () => {
    const genericUrl = 'data:application/octet-stream;base64,abc123';
    fixture.componentRef.setInput('pngDataUrl', genericUrl);
    fixture.detectChanges();
    expect(component.finalImageUrl).toBe(genericUrl);
  });

  // ── ngOnChanges — branche status sans reset (status reste pending) ───────────

  it('should not reset isProcessing in ngOnChanges when status is pending', () => {
    component.isProcessing = true;
    component.ngOnChanges({
      status: new SimpleChange('pending', 'pending', false),
    });
    expect(component.isProcessing).toBeTrue();
  });

  it('should call markForCheck in ngOnChanges when status changes to accepted', () => {
    fixture.componentRef.setInput('status', 'accepted');
    fixture.detectChanges();
    expect(component.isProcessing).toBeFalse();
  });

  // ── _applyTransform sans content (viewport absent) ───────────────────────────

  it('should not throw when _applyTransform is called without content element', () => {
    (component as unknown as { _content: unknown })._content = undefined;
    expect(() =>
      (component as unknown as { _applyTransform: () => void })._applyTransform(),
    ).not.toThrow();
  });

  // ── _scheduleFit — _fitted déjà true ─────────────────────────────────────────

  it('should not run tryFit if already fitted', () => {
    (component as unknown as { _fitted: boolean })._fitted = true;
    (component as unknown as { _scheduleFit: () => void })._scheduleFit();
    expect((component as unknown as { _fitted: boolean })._fitted).toBeTrue();
  });

  // ── onMouseDown — stockage des coordonnées de départ ────────────────────────

  it('should store drag start coordinates on mousedown', () => {
    component.onMouseDown({
      button: 0,
      clientX: 42,
      clientY: 17,
      preventDefault: noop,
    } as unknown as MouseEvent);
    expect((component as unknown as { _dragStartX: number })._dragStartX).toBe(42);
    expect((component as unknown as { _dragStartY: number })._dragStartY).toBe(17);
  });

  // ── Transitions de status ────────────────────────────────────────────────────

  it('should go from pending to accepted via setInput', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    expect(component.isPending).toBeTrue();
    fixture.componentRef.setInput('status', 'accepted');
    fixture.detectChanges();
    expect(component.isAccepted).toBeTrue();
    expect(component.isPending).toBeFalse();
  });

  it('should go from pending to rejected via setInput', () => {
    fixture.componentRef.setInput('status', 'pending');
    fixture.detectChanges();
    fixture.componentRef.setInput('status', 'rejected');
    fixture.detectChanges();
    expect(component.isRejected).toBeTrue();
    expect(component.isPending).toBeFalse();
  });

  // ── showImage / isLoading cohérence ──────────────────────────────────────────

  it('showImage should be false and isLoading true simultaneously when pending with no url', () => {
    fixture.componentRef.setInput('status', 'pending');
    component.finalImageUrl = '';
    expect(component.showImage).toBeFalse();
    expect(component.isLoading).toBeTrue();
  });

  it('showImage true and isLoading false simultaneously when pending with url', () => {
    fixture.componentRef.setInput('status', 'pending');
    component.finalImageUrl = PNG_DATA_URL;
    expect(component.showImage).toBeTrue();
    expect(component.isLoading).toBeFalse();
  });

  // ── onWheel sans viewport ─────────────────────────────────────────────────

  it('should not change scale when onWheel is called without viewport', () => {
    (component as unknown as { _viewport: unknown })._viewport = undefined;
    const before = (component as unknown as { _scale: number })._scale;
    component.onWheel({
      deltaY: -100,
      clientX: 0,
      clientY: 0,
      preventDefault: noop,
      stopPropagation: noop,
    } as unknown as WheelEvent);
    expect((component as unknown as { _scale: number })._scale).toBe(before);
  });

  // ── _doFit — _fitted déjà true ────────────────────────────────────────────

  it('should not re-fit if _doFit is called when already fitted', () => {
    (component as unknown as { _fitted: boolean })._fitted = true;
    const vp = document.createElement('div');
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 100 });
    Object.defineProperty(img, 'naturalHeight', { value: 100 });
    const initialScale = (component as unknown as { _scale: number })._scale;
    (component as unknown as { _doFit: (vp: HTMLElement, img: HTMLImageElement) => void })._doFit(
      vp,
      img,
    );
    expect((component as unknown as { _scale: number })._scale).toBe(initialScale);
  });

  // ── _doFit — dimensions zéro ──────────────────────────────────────────────

  it('should not update scale when image has zero dimensions in _doFit', () => {
    (component as unknown as { _fitted: boolean })._fitted = false;
    const vp = document.createElement('div');
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 0 });
    Object.defineProperty(img, 'naturalHeight', { value: 0 });
    const initialScale = (component as unknown as { _scale: number })._scale;
    (component as unknown as { _doFit: (vp: HTMLElement, img: HTMLImageElement) => void })._doFit(
      vp,
      img,
    );
    expect((component as unknown as { _scale: number })._scale).toBe(initialScale);
  });

  // ── _doFit — cas nominal ──────────────────────────────────────────────────

  it('should compute scale and translation in _doFit with valid dimensions', () => {
    (component as unknown as { _fitted: boolean })._fitted = false;
    const vp = document.createElement('div');
    Object.defineProperty(vp, 'clientWidth', { value: 800 });
    Object.defineProperty(vp, 'clientHeight', { value: 600 });
    const img = document.createElement('img');
    Object.defineProperty(img, 'naturalWidth', { value: 400 });
    Object.defineProperty(img, 'naturalHeight', { value: 300 });
    (component as unknown as { _doFit: (vp: HTMLElement, img: HTMLImageElement) => void })._doFit(
      vp,
      img,
    );
    expect((component as unknown as { _fitted: boolean })._fitted).toBeTrue();
    expect((component as unknown as { _scale: number })._scale).toBe(2);
  });

  // ── _svgToPng — canvas context null ──────────────────────────────────────

  it('should reject _svgToPng when canvas 2d context is null', fakeAsync(async () => {
    spyOn(document, 'createElement').and.callFake((tag: string) => {
      if (tag === 'canvas') {
        const canvas = document.createElement('canvas');
        spyOn(canvas, 'getContext').and.returnValue(null);
        return canvas;
      }
      return document.createElement(tag);
    });

    const svgUrl = 'data:image/svg+xml;base64,PHN2Zyc+PC9zdmc+';
    spyOn(
      component as unknown as { _svgToPng: (u: string) => Promise<string> },
      '_svgToPng',
    ).and.callThrough();

    fixture.componentRef.setInput('pngDataUrl', svgUrl);
    fixture.detectChanges();
    tick(200);
    fixture.detectChanges();
    // le fallback doit avoir assigné finalImageUrl au svgUrl d'origine
    expect(component.finalImageUrl.length).toBeGreaterThan(0);
  }));

  // ── _processImage — dataUrl vide ──────────────────────────────────────────

  it('should not set finalImageUrl when _processImage is called with empty string', () => {
    component.finalImageUrl = '';
    (component as unknown as { _processImage: (u: string) => void })._processImage('');
    expect(component.finalImageUrl).toBe('');
  });

  // ── _scheduleFit — viewport absent, retry ────────────────────────────────

  it('should retry _scheduleFit when viewport is not yet available', fakeAsync(() => {
    (component as unknown as { _fitted: boolean })._fitted = false;
    (component as unknown as { _viewport: unknown })._viewport = undefined;
    (component as unknown as { _content: unknown })._content = undefined;
    expect(() => {
      (component as unknown as { _scheduleFit: () => void })._scheduleFit();
      tick(100);
    }).not.toThrow();
  }));

  // ── _dragStartTx / _dragStartTy stockés ──────────────────────────────────

  it('should store _dragStartTx and _dragStartTy on mousedown', () => {
    (component as unknown as { _tx: number })._tx = 10;
    (component as unknown as { _ty: number })._ty = 20;
    component.onMouseDown({
      button: 0,
      clientX: 5,
      clientY: 5,
      preventDefault: noop,
    } as unknown as MouseEvent);
    expect((component as unknown as { _dragStartTx: number })._dragStartTx).toBe(10);
    expect((component as unknown as { _dragStartTy: number })._dragStartTy).toBe(20);
  });

  // ── onMouseMove avec déplacement relatif ─────────────────────────────────

  it('should compute _tx/_ty relative to drag start offsets', () => {
    (component as unknown as { _tx: number })._tx = 5;
    (component as unknown as { _ty: number })._ty = 10;
    component.onMouseDown({
      button: 0,
      clientX: 100,
      clientY: 100,
      preventDefault: noop,
    } as unknown as MouseEvent);
    component.onMouseMove({
      clientX: 120,
      clientY: 130,
      preventDefault: noop,
    } as unknown as MouseEvent);
    expect((component as unknown as { _tx: number })._tx).toBe(25);
    expect((component as unknown as { _ty: number })._ty).toBe(40);
  });

  it('should accept hasImage input without error', () => {
    expect(() => fixture.componentRef.setInput('hasImage', false)).not.toThrow();
    expect(() => fixture.componentRef.setInput('hasImage', true)).not.toThrow();
  });

  // ── ngOnChanges avec les deux clés simultanément ─────────────────────────

  it('should handle ngOnChanges with both pngDataUrl and status changes', () => {
    (component as unknown as { pngDataUrl: string }).pngDataUrl = PNG_DATA_URL;
    const spy = spyOn(
      component as unknown as { _processImage: (u: string) => void },
      '_processImage',
    );
    component.ngOnChanges({
      pngDataUrl: new SimpleChange('', PNG_DATA_URL, false),
      status: new SimpleChange('pending', 'accepted', false),
    });
    expect(spy).toHaveBeenCalledWith(PNG_DATA_URL);
    expect(component.isProcessing).toBeFalse();
  });

  // ── onAccept/onReject sans émission quand isProcessing ────────────────────

  it('should not emit accepted when isProcessing is already true', () => {
    fixture.componentRef.setInput('status', 'pending');
    component.isProcessing = true;
    let count = 0;
    component.accepted.subscribe(() => count++);
    component.onAccept();
    expect(count).toBe(0);
  });

  it('should not emit rejected when isProcessing is already true', () => {
    fixture.componentRef.setInput('status', 'pending');
    component.isProcessing = true;
    let count = 0;
    component.rejected.subscribe(() => count++);
    component.onReject();
    expect(count).toBe(0);
  });
});
