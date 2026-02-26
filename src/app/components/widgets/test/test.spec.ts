import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Test } from './test';
import { TestService } from '../../../services/test/test-service';
import { of } from 'rxjs';
import { By } from '@angular/platform-browser';

describe('Test Component', () => {
  let component: Test;
  let fixture: ComponentFixture<Test>;
  let mockTestService: jasmine.SpyObj<TestService>;

  beforeEach(async () => {
    // Création d'un spy pour le service
    mockTestService = jasmine.createSpyObj('TestService', ['getMessageTest']);
    // Définir le retour du mock
    mockTestService.getMessageTest.and.returnValue(of('Hello Test!'));

    await TestBed.configureTestingModule({
      imports: [Test], // comme ton component est standalone
      providers: [
        { provide: TestService, useValue: mockTestService }
      ]
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(Test);
    component = fixture.componentInstance;
    fixture.detectChanges(); // déclenche ngOnInit
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should set message from TestService', () => {
    expect(component.message).toBe('Hello Test!');
  });

  it('should render message in template', () => {
    const p: HTMLElement = fixture.debugElement.query(By.css('p')).nativeElement;
    expect(p.textContent).toBe('Hello Test!');
  });
});
