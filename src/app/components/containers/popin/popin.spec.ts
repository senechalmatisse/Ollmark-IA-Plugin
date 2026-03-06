import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Popin } from './popin';
import {By} from '@angular/platform-browser';

describe('Popin', () => {
  let component: Popin;
  let fixture: ComponentFixture<Popin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Popin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Popin);
    fixture.componentRef.setInput("label", "TEST")
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it("should emit close when X clicked", () => {
    let clicked = false
    component.closed.subscribe(() => clicked = true)
    const cross = fixture.debugElement.query(By.css(".close-btn"))
    cross.triggerEventHandler('click');
    fixture.detectChanges()
    expect(clicked).toBeTrue()
  })
});
