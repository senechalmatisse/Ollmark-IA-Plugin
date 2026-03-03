import {ComponentFixture, TestBed} from '@angular/core/testing';

import {Button} from './button';
import {ButtonType} from '../../../models/ButtonType';
import {By} from '@angular/platform-browser';

describe('Button', () => {
  let component: Button;
  let fixture: ComponentFixture<Button>;
  let called = 0

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Button]
    })
      .compileComponents();
    called = 0
    fixture = TestBed.createComponent(Button);
    fixture.componentRef.setInput("buttonText", "TEST")
    fixture.componentRef.setInput("buttonType", ButtonType.BASIC)
    component = fixture.componentInstance;
    component.buttonClicked.subscribe(() => {
      called += 1
    })
    fixture.detectChanges();

  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it("should emit buttonClicked event when clicked", () => {
    const button = fixture.debugElement.query(By.css(".Button"))
    if(!button) {
      fail()
      return
    }
    button.triggerEventHandler('click');
    expect(called).toBeGreaterThan(0)
  })
});
