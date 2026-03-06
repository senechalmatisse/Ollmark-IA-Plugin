import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastComponent } from './toast.component';
import { ToastService } from '../../../services/toast/toast.service';

describe('ToastComponent', () => {

  let fixture: ComponentFixture<ToastComponent>;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastComponent],
      providers: [ToastService]
    }).compileComponents();

    fixture = TestBed.createComponent(ToastComponent);

    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('should not render anything if not visible', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.toast-wrapper')).toBeNull();
  });

  it('should render wait toast', () => {
    toastService.showWait();
    fixture.detectChanges(); // Met à jour le HTML après le changement du signal

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.toast-wrapper')).not.toBeNull();
    expect(compiled.querySelector('.toast-message')?.textContent).toContain('Veuillez patienter...');
    expect(compiled.querySelector('img')?.getAttribute('alt')).toBe('wait');
  });

  it('should render success toast', () => {
    toastService.showSuccess();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.toast-wrapper')).not.toBeNull();
    expect(compiled.querySelector('.toast-message')?.textContent).toContain('Contenu importé avec succès');
    expect(compiled.querySelector('img')?.getAttribute('alt')).toBe('success');
  });
});
