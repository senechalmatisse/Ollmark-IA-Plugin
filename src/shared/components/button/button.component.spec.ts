import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  let component: ButtonComponent;
  let fixture: ComponentFixture<ButtonComponent>;
  let button: HTMLButtonElement;
  let icon: HTMLImageElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
    component = fixture.componentInstance;

    component.icon = 'test.png'; // AVANT detectChanges()

    fixture.detectChanges();

    button = fixture.nativeElement.querySelector('button');
    icon = fixture.nativeElement.querySelector('.icon-img');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render text', () => {
    component.text = 'Test Button';
    fixture.detectChanges();

    expect(button.textContent).toContain('Test Button');
  });

  it('should apply width and height', () => {
    component.width = '200px';
    component.height = '50px';
    fixture.detectChanges();

    expect(button.style.width).toBe('200px');
    expect(button.style.height).toBe('50px');
  });
  
  it('should apply fontSize', () => {
    component.fontSize = '20px';
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(getComputedStyle(button).fontSize).toBe('20px');
  });

  it('should apply paddingXY array', () => {
    component.paddingXY = ['10px', '20px'];
    fixture.detectChanges();

    expect(button.style.padding).toBe('10px 20px');
  });

  it('should apply paddingXY value', () => {
    component.paddingXY = "20px";
    fixture.detectChanges();

    expect(button.style.padding).toBe('20px');
  });

  it('should apply marginXY array', () => {
    component.marginXY = ['10px', '20px'];
    fixture.detectChanges();

    expect(button.style.margin).toBe('10px 20px');
  });

  it('should apply marginXY value', () => {
    component.marginXY = "20px";
    fixture.detectChanges();

    expect(button.style.margin).toBe('20px');
  });


  it('should apply background and text color', () => {
    component.backgroundColor = 'red';
    component.textColor = 'white';
    fixture.detectChanges();

    expect(button.style.backgroundColor).toBe('red');
    expect(button.style.color).toBe('white');
  });

  it('should emit click event', () => {
    spyOn(component.onClick, 'emit');

    button.click();

    expect(component.onClick.emit).toHaveBeenCalled();
  });

  it('should not emit click when disabled', () => {
    component.disabled = true;
    spyOn(component.onClick, 'emit');
    fixture.detectChanges();

    button.click();

    expect(component.onClick.emit).not.toHaveBeenCalled();
  });

  it('should apply iconSize value', () => {
    component.iconSize = '10px';
    fixture.detectChanges();

    expect(icon.style.width).toBe('10px');
  });

  it('should apply iconPadding value', () => {
    component.iconPadding = '10px';
    fixture.detectChanges();

    expect(icon.style.padding).toBe('10px');
  });

  it('should apply rounded true', () => {
    component.rounded = true;
    fixture.detectChanges();

    expect(button.style.borderRadius).toBe('25px');
  });

  it('should apply rounded false', () => {
    component.rounded = false;
    fixture.detectChanges();

    expect(button.style.borderRadius).toBe('16px');
  });

  it('should not render icon when none provided', () => {
    component.icon = '';
    fixture.detectChanges();

    const icon = fixture.nativeElement.querySelector('.icon-img');
    expect(icon).toBeNull();
  });

  it('should apply disabled styles', () => {
    component.disabled = true;
    fixture.detectChanges();

    expect(button.style.cursor).toBe('not-allowed');
  });

  it('should apply enabled styles', () => {
    component.disabled = false;
    fixture.detectChanges();

    expect(button.style.cursor).toBe('pointer');
  });

});
