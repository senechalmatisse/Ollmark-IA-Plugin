import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Popin } from './popin';

describe('Popin', () => {
  let component: Popin;
  let fixture: ComponentFixture<Popin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Popin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Popin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
