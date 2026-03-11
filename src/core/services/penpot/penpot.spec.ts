import { TestBed } from '@angular/core/testing';

import { Penpot } from './penpot';

describe('Penpot', () => {
  let service: Penpot;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Penpot);
  });

  it('should update fileId$ when fileId message is received', (done) => {
    const testFileId = 'test-file-123';
    
    service.fileId$.subscribe(id => {
      if (id === testFileId) {
        expect(id).toBe(testFileId);
        done();
      }
    });

    window.postMessage({ type: 'fileId', fileId: testFileId }, '*');
  });
});
