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
    const testValue = "boulangerie"
    const input = (fixture.nativeElement as HTMLDivElement)
      .querySelector("input")
    if (input === null) {
      fail();
      return
    }
    input.value = testValue
    input.dispatchEvent(new Event("input"))
    expect(component.timerId).not.toBe(0)
    expect(value).toBe("")
    expect(called).toBe(0)
  })

  it('should send emit after >500ms', async () => {
    const testValue = "boulangerie"
    const input = (fixture.nativeElement as HTMLDivElement)
      .querySelector("input")
    if (input === null) {
      fail();
      return
    }
    input.value = testValue
    input.dispatchEvent(new Event("input"))
    await fixture.whenStable()
    expect(value).toBe(testValue)
    expect(called).toBeGreaterThan(0)
  })

  it('should be focused if input is clicked', async () => {
    const input = (fixture.nativeElement as HTMLDivElement)
      .querySelector("input")
    if (input === null) {
      fail();
      return
    }
    input.click()
    input.dispatchEvent(new Event("focus"))
    await fixture.whenStable()
    expect(component.isFocused()).toBeTrue()
  })

  it('should be unfocused if input is blurred', async () => {
    const input = (fixture.nativeElement as HTMLDivElement)
      .querySelector("input")
    if (input === null) {
      fail();
      return
    }
    input.dispatchEvent(new Event("focus"))
    await fixture.whenStable()
    input.dispatchEvent(new Event("blur"))
    await fixture.whenStable()
    expect(component.isFocused()).toBeFalse()
  })
});
