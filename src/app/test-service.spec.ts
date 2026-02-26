import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestService } from './test-service';

describe('TestService', () => {
  let service: TestService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TestService]
    });

    service = TestBed.inject(TestService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Vérifie qu'aucune requête HTTP non testée ne reste
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return message from getMessageTest', () => {
    const mockResponse = 'Hello from service!';

    service.getMessageTest().subscribe((message) => {
      expect(message).toBe(mockResponse);
    });

    const req = httpMock.expectOne('http://localhost:8080');
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse); // simule la réponse HTTP
  });
});
