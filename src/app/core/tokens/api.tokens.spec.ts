import { TestBed } from '@angular/core/testing';
import {WEBSOCKET_URL} from './api.tokens';

describe('Environment Injection Tokens', () => {


  describe('WEBSOCKET_URL', () => {

    it('should return value from global PENPOT_WEBSOCKET_URL', () => {

      (globalThis as Record<string, unknown>)['PENPOT_WEBSOCKET_URL'] = 'ws://server:9000/ws';

      const value = TestBed.inject(WEBSOCKET_URL);

      expect(value).toBe('ws://server:9000/ws');
    });

    it('should fallback to localhost websocket when constant is missing', () => {

      delete (globalThis as Record<string, unknown>)['PENPOT_WEBSOCKET_URL'];

      const value = TestBed.inject(WEBSOCKET_URL);

      expect(value).toBe('ws://localhost:8080/plugin');
    });

  });

  

});