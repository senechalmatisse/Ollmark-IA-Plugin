import { TestBed } from '@angular/core/testing';
import { API_BASE_URL, WEBSOCKET_URL, PENPOT_ORIGIN } from './api.tokens';

describe('Environment Injection Tokens', () => {

  describe('API_BASE_URL', () => {

    it('should return value from VITE_API_BASE_URL env', () => {

      (import.meta as any).env = {
        VITE_API_BASE_URL: 'http://api.test'
      };

      const value = TestBed.inject(API_BASE_URL);

      expect(value).toBe('http://api.test');
    });

    it('should fallback to localhost when env variable is missing', () => {

      (import.meta as any).env = {};

      const value = TestBed.inject(API_BASE_URL);

      expect(value).toBe('http://localhost:8080');
    });

  });

  describe('WEBSOCKET_URL', () => {

    it('should return value from global PENPOT_WEBSOCKET_URL', () => {

      (globalThis as any).PENPOT_WEBSOCKET_URL = 'ws://server:9000/ws';

      const value = TestBed.inject(WEBSOCKET_URL);

      expect(value).toBe('ws://server:9000/ws');
    });

    it('should fallback to localhost websocket when constant is missing', () => {

      delete (globalThis as any).PENPOT_WEBSOCKET_URL;

      const value = TestBed.inject(WEBSOCKET_URL);

      expect(value).toBe('ws://localhost:8080/plugin');
    });

  });

  

});