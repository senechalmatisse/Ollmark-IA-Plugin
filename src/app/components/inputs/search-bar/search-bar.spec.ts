import {ComponentFixture, TestBed} from '@angular/core/testing';

import {SearchBar} from './search-bar';
import {OutputEmitterRef} from '@angular/core';

describe('SearchBar', () => {
  let component: SearchBar;
  let fixture: ComponentFixture<SearchBar>;
  let value = ""
  let called = 0

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchBar]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SearchBar);
    component = fixture.componentInstance;
    fixture.detectChanges();
    value = ""
    called = 0
    component.timerId = 0
    component.inputUpdated = {
      emit: (event: string) => {
        value = event
        called += 1
      }
    } as unknown as OutputEmitterRef<string>

  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not send emit right away', () => {
    component.onInputUpdate({target: {value: "test"}} as unknown as Event)
    expect(component.timerId).not.toBe(0)
    expect(value).toBe("")
    expect(called).toBe(0)
  })

  it('should send emit after >500ms', async () => {
    const testValue = "test"
    const wait = (t: number) => new Promise<void>(
      (resolve) => setTimeout(resolve, t)
    )
    component.onInputUpdate({target: {value: testValue}} as unknown as Event)
    await wait(520)
    expect(value).toBe(testValue)
    expect(called).not.toBe(0)
  })
});
