import { TestBed } from '@angular/core/testing';
import { PENPOT_SERVICE, penpotServiceFactory, IPenpotService } from './penpot.service';

describe('PenpotService', () => {
  let service: IPenpotService;
  let originalWindowParent: Window;

  beforeEach(() => {
    
    originalWindowParent = window.parent;
    
   
    spyOn(console, 'log');

    TestBed.configureTestingModule({
      providers: [
        { provide: PENPOT_SERVICE, useFactory: penpotServiceFactory }
      ]
    });
  });

  afterEach(() => {
    
    Object.defineProperty(window, 'parent', {
      writable: true,
      value: originalWindowParent
    });
  });

  describe('Simulation Mode (Outside Penpot)', () => {
    beforeEach(() => {
      
      Object.defineProperty(window, 'parent', {
        writable: true,
        value: window
      });
      service = TestBed.inject(PENPOT_SERVICE);
    });

    it('should be in simulation mode', () => {
      expect(service.isSimulation).toBeTrue();
    });

    it('should use console.log for createText', () => {
      service.createText('Test Text');
      
      
      expect(console.log).toHaveBeenCalledWith(
        '%c[Simulation Penpot]',
        'color: #6366f1; font-weight: bold',
        { type: 'create-text', content: 'Test Text' }
      );
    });

    it('should use console.log for createImage', () => {
      service.createImage('https://image.url');
      
      expect(console.log).toHaveBeenCalledWith(
        '%c[Simulation Penpot]',
        'color: #6366f1; font-weight: bold',
        { type: 'create-rectangle-with-image', content: 'https://image.url' }
      );
    });

    it('should use console.log for notify', () => {
      service.notify('Notification test');
      
      expect(console.log).toHaveBeenCalledWith(
        '%c[Simulation Penpot]',
        'color: #6366f1; font-weight: bold',
        { type: 'notify', content: 'Notification test' }
      );
    });

    it('should use console.log for closePlugin', () => {
      service.closePlugin();
      
      expect(console.log).toHaveBeenCalledWith(
        '%c[Simulation Penpot]',
        'color: #6366f1; font-weight: bold',
        { type: 'close' }
      );
    });
  });

  describe('Real Mode (Inside Penpot iframe)', () => {
    let mockParentPostMessage: jasmine.Spy;

    beforeEach(() => {
      
      mockParentPostMessage = jasmine.createSpy('postMessage');
      
      Object.defineProperty(window, 'parent', {
        writable: true,
        value: { postMessage: mockParentPostMessage }
      });

      
      spyOn(window, 'addEventListener').and.callThrough();
      
      service = TestBed.inject(PENPOT_SERVICE);
    });

    it('should not be in simulation mode', () => {
      expect(service.isSimulation).toBeFalse();
    });

    it('should attach an event listener for Penpot messages', () => {
      expect(window.addEventListener).toHaveBeenCalledWith('message', jasmine.any(Function));
    });

    it('should send a postMessage for createText', () => {
      service.createText('Test Text');
      
     
      expect(mockParentPostMessage).toHaveBeenCalledWith(
        { type: 'create-text', content: 'Test Text' },
        '*'
      );
    });

    it('should send a postMessage for createImage', () => {
      service.createImage('https://image.url');
      
      expect(mockParentPostMessage).toHaveBeenCalledWith(
        { type: 'create-rectangle-with-image', content: 'https://image.url' },
        '*'
      );
    });

    it('should send a postMessage for notify', () => {
      service.notify('Notification Penpot');
      
      expect(mockParentPostMessage).toHaveBeenCalledWith(
        { type: 'notify', content: 'Notification Penpot' },
        '*'
      );
    });

    it('should send a postMessage for closePlugin', () => {
      service.closePlugin();
      
      expect(mockParentPostMessage).toHaveBeenCalledWith(
        { type: 'close' },
        '*'
      );
    });
  });
});