import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { PreviewCardComponent } from './preview-card.component';

describe('PreviewCardComponent', () => {
  let component: PreviewCardComponent;
  let fixture: ComponentFixture<PreviewCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PreviewCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PreviewCardComponent);
    component = fixture.componentInstance;
    component.pngDataUrl = 'data:image/png;base64,abc';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show action buttons when status is pending', () => {
    component.status = 'pending';
    fixture.detectChanges();
    const buttons = fixture.debugElement.queryAll(By.css('.preview-card__btn'));
    expect(buttons.length).toBe(2);
  });

  it('should show accepted badge when status is accepted', () => {
    component.status = 'accepted';
    fixture.detectChanges();
    const badge = fixture.debugElement.query(By.css('.preview-card__badge--accepted'));
    expect(badge).toBeTruthy();
    expect(fixture.debugElement.queryAll(By.css('.preview-card__btn')).length).toBe(0);
  });

  it('should show rejected badge when status is rejected', () => {
    component.status = 'rejected';
    fixture.detectChanges();
    const badge = fixture.debugElement.query(By.css('.preview-card__badge--rejected'));
    expect(badge).toBeTruthy();
  });

  it('should emit accepted when accept button is clicked', () => {
    component.status = 'pending';
    fixture.detectChanges();
    let emitted = false;
    component.accepted.subscribe(() => (emitted = true));
    const btn = fixture.debugElement.query(By.css('.preview-card__btn--accept'));
    btn.triggerEventHandler('click', null);
    expect(emitted).toBeTrue();
  });

  it('should emit rejected when reject button is clicked', () => {
    component.status = 'pending';
    fixture.detectChanges();
    let emitted = false;
    component.rejected.subscribe(() => (emitted = true));
    const btn = fixture.debugElement.query(By.css('.preview-card__btn--reject'));
    btn.triggerEventHandler('click', null);
    expect(emitted).toBeTrue();
  });

  it('should not emit accepted when status is not pending', () => {
    component.status = 'accepted';
    fixture.detectChanges();
    let emitted = false;
    component.accepted.subscribe(() => (emitted = true));
    component.onAccept();
    expect(emitted).toBeFalse();
  });

  it('should display the preview image', () => {
    const img = fixture.debugElement.query(By.css('.preview-card__image'));
    expect(img.nativeElement.src).toContain('data:image/png;base64,abc');
  });
});
