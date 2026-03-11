import { TestBed } from '@angular/core/testing';

import { Penpot } from './penpot';

describe('Penpot', () => {
  let service: Penpot;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Penpot);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
