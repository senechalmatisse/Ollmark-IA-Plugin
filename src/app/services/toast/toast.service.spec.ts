import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  it('should be created with initial state', () => {
    expect(service).toBeTruthy();
    expect(service.isVisible()).toBeFalse();
    expect(service.type()).toBeNull();
    expect(service.message()).toBe('');
  });

  it('should show wait state', () => {
    service.showWait();
    expect(service.isVisible()).toBeTrue();
    expect(service.type()).toBe('wait');
    expect(service.message()).toBe('Veuillez patienter...');
  });

  it('should show success state and hide after 3 seconds', fakeAsync(() => {
    service.showSuccess();
    
    
    expect(service.isVisible()).toBeTrue();
    expect(service.type()).toBe('success');
    expect(service.message()).toBe('Contenu importé avec succès');

   
    tick(3000);

    
    expect(service.isVisible()).toBeFalse();
  }));

  it('should hide manually', () => {
    service.showWait();
    service.hide();
    expect(service.isVisible()).toBeFalse();
  });
});