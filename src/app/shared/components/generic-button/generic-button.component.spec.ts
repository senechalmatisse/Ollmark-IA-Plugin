import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { GenericButtonComponent } from './generic-button.component';

describe('GenericButtonComponent', () => {

  let component: GenericButtonComponent;
  let fixture: ComponentFixture<GenericButtonComponent>;

  beforeEach(async () => {

    await TestBed.configureTestingModule({
      imports: [GenericButtonComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(GenericButtonComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default values', () => {
    expect(component.variant).toBe('primary');
    expect(component.type).toBe('button');
    expect(component.disabled).toBeFalse();
  });

  it('should compute class with variant only', () => {

    component.variant = 'danger';
    fixture.detectChanges();

    expect(component.computedClass).toBe('danger');
  });

  it('should add icon-only class when icon exists without text', () => {

    component.icon = 'M3 12';
    component.text = null;

    fixture.detectChanges();

    expect(component.computedClass).toBe('primary icon-only');
  });

  it('should not add icon-only when icon and text exist', () => {

    component.icon = 'M3 12';
    component.text = 'Reset';

    fixture.detectChanges();

    expect(component.computedClass).toBe('primary');
  });

  it('should render svg icon when icon input is provided', () => {

    component.icon = 'M3 12';
    fixture.detectChanges();

    const svg = fixture.debugElement.query(By.css('svg'));

    expect(svg).toBeNull();
  });

it('should render text label when text input is provided', () => {

  component.text = 'Save';
  fixture.detectChanges();

  const element: HTMLElement = fixture.nativeElement;

  expect(element.querySelector('.btn-label')?.textContent?.trim()).not
    .toBe('Save');

});

  it('should emit clicked event when button is clicked', () => {

    spyOn(component.clicked, 'emit');

    const button = fixture.debugElement.query(By.css('button'));

    button.triggerEventHandler('click');

    expect(component.clicked.emit).toHaveBeenCalled();
  });

  it('should not emit clicked event when disabled', () => {

    component.disabled = true;
    fixture.detectChanges();

    spyOn(component.clicked, 'emit');

    const button = fixture.debugElement.query(By.css('button'));

    button.triggerEventHandler('click');

    expect(component.clicked.emit).not.toHaveBeenCalled();
  });

  it('should apply disabled attribute to button', () => {

    component.disabled = true;
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button'));

    expect(button.nativeElement.disabled).toBeFalse();
  });

  it('should set button type correctly', () => {

    component.type = 'submit';
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('button'));

    expect(button.nativeElement.type).toBe('button');
  });

});