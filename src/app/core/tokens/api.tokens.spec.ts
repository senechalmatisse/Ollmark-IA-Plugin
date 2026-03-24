import { TestBed } from '@angular/core/testing';
import { API_BASE_URL, WEBSOCKET_URL, PENPOT_ORIGIN } from './api.tokens';

describe('API Tokens', () => {
  afterEach(() => TestBed.resetTestingModule());

  // ── API_BASE_URL ────────────────────────────────────────────────────────

  describe('API_BASE_URL', () => {
    it('should return the factory fallback when no provider is configured', () => {
      TestBed.configureTestingModule({});
      expect(TestBed.inject(API_BASE_URL)).toBe('http://localhost:8080');
    });

    it('should return the overridden value when provided explicitly', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: API_BASE_URL, useValue: 'https://api.ollmark.io' }],
      });
      expect(TestBed.inject(API_BASE_URL)).toBe('https://api.ollmark.io');
    });
  });

  // ── WEBSOCKET_URL ───────────────────────────────────────────────────────

  describe('WEBSOCKET_URL', () => {
    it('should return the factory fallback when no provider is configured', () => {
      TestBed.configureTestingModule({});
      expect(TestBed.inject(WEBSOCKET_URL)).toBe('ws://localhost:8080/plugin');
    });

    it('should return the overridden value when provided explicitly', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: WEBSOCKET_URL, useValue: 'ws://10.130.163.57:8080/plugin' }],
      });
      expect(TestBed.inject(WEBSOCKET_URL)).toBe('ws://10.130.163.57:8080/plugin');
    });

    it('should return a valid WebSocket URL (starts with ws:// or wss://)', () => {
      TestBed.configureTestingModule({});
      expect(TestBed.inject(WEBSOCKET_URL)).toMatch(/^wss?:\/\//);
    });
  });

  // ── PENPOT_ORIGIN ───────────────────────────────────────────────────────

  describe('PENPOT_ORIGIN', () => {
    it('should return the overridden value when provided explicitly', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PENPOT_ORIGIN, useValue: 'https://design.penpot.app' }],
      });
      expect(TestBed.inject(PENPOT_ORIGIN)).toBe('https://design.penpot.app');
    });

    it('should accept a localhost override for local development', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PENPOT_ORIGIN, useValue: 'http://localhost:4200' }],
      });
      expect(TestBed.inject(PENPOT_ORIGIN)).toBe('http://localhost:4200');
    });

    it('should resolve a non-empty, non-wildcard origin from the browser context', () => {
      TestBed.configureTestingModule({});
      const value = TestBed.inject(PENPOT_ORIGIN);
      expect(value).toBeTruthy();
      expect(value).not.toBe('*');
      expect(value).toMatch(/^https?:\/\//);
    });

    it('should return a string (not throw) when a provider is set', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PENPOT_ORIGIN, useValue: 'https://design.penpot.app' }],
      });
      expect(() => TestBed.inject(PENPOT_ORIGIN)).not.toThrow();
    });
  });
});
