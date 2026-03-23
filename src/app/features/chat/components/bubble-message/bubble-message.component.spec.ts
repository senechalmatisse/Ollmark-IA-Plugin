import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BubbleMessageComponent } from './bubble-message.component';
import { ChatMessage } from '../../../../core/models';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'test-id-001',
    role: 'user',
    content: 'Hello world',
    timestamp: new Date('2026-03-15T10:30:00.000Z'),
    ...overrides,
  };
}

function makePreviewMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return makeMessage({
    role: 'assistant',
    content: '',
    bufferPageId: 'buf-001',
    previewStatus: 'pending',
    previewPngUrl: 'data:image/png;base64,abc',
    previewCode: 'penpot.createRectangle()',
    ...overrides,
  });
}

function setup(msg: ChatMessage): ComponentFixture<BubbleMessageComponent> {
  TestBed.configureTestingModule({
    imports: [BubbleMessageComponent],
  });
  const fixture = TestBed.createComponent(BubbleMessageComponent);
  fixture.componentInstance.message = msg;
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

// ── Création ──────────────────────────────────────────────────────────────────

describe('BubbleMessageComponent — création', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    const f = setup(makeMessage());
    expect(f.componentInstance).toBeTruthy();
  });
});

// ── Getters propres ──────────────────────────────────────────────────────────

describe('BubbleMessageComponent — getters', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('isPreviewMessage retourne true quand bufferPageId et previewStatus sont définis', () => {
    const f = setup(makePreviewMessage());
    expect(f.componentInstance.isPreviewMessage).toBeTrue();
  });

  it('isPreviewMessage retourne false quand bufferPageId est absent', () => {
    const f = setup(makeMessage({ role: 'assistant', previewStatus: 'pending' }));
    expect(f.componentInstance.isPreviewMessage).toBeFalse();
  });

  it('isPreviewMessage retourne false quand previewStatus est absent', () => {
    const f = setup(makeMessage({ role: 'assistant', bufferPageId: 'buf-001' }));
    expect(f.componentInstance.isPreviewMessage).toBeFalse();
  });

  it('hasPreviewImage retourne true quand previewPngUrl est défini', () => {
    const f = setup(makePreviewMessage());
    expect(f.componentInstance.hasPreviewImage).toBeTrue();
  });

  it('hasPreviewImage retourne false quand previewPngUrl est absent', () => {
    const f = setup(makePreviewMessage({ previewPngUrl: undefined }));
    expect(f.componentInstance.hasPreviewImage).toBeFalse();
  });

  it('hasPreviewImage retourne false quand previewPngUrl est une chaîne vide', () => {
    const f = setup(makePreviewMessage({ previewPngUrl: '' }));
    expect(f.componentInstance.hasPreviewImage).toBeFalse();
  });
});

// ── Émissions — previewAccepted ───────────────────────────────────────────────

describe('BubbleMessageComponent — previewAccepted', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('émet previewAccepted avec bufferPageId et code quand bufferPageId est défini', () => {
    const f = setup(makePreviewMessage());
    let emitted: { bufferPageId: string; code: string } | undefined;
    f.componentInstance.previewAccepted.subscribe((v) => (emitted = v));
    f.componentInstance.onPreviewAccepted();
    expect(emitted).toEqual({ bufferPageId: 'buf-001', code: 'penpot.createRectangle()' });
  });

  it('émet previewAccepted avec code vide quand previewCode est undefined', () => {
    const f = setup(makePreviewMessage({ previewCode: undefined }));
    let emitted: { bufferPageId: string; code: string } | undefined;
    f.componentInstance.previewAccepted.subscribe((v) => (emitted = v));
    f.componentInstance.onPreviewAccepted();
    expect(emitted?.code).toBe('');
  });

  it("n'émet pas previewAccepted quand bufferPageId est absent", () => {
    const f = setup(makeMessage({ role: 'assistant' }));
    let emitted = false;
    f.componentInstance.previewAccepted.subscribe(() => (emitted = true));
    f.componentInstance.onPreviewAccepted();
    expect(emitted).toBeFalse();
  });
});

// ── Émissions — previewRejected ───────────────────────────────────────────────

describe('BubbleMessageComponent — previewRejected', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('émet previewRejected avec bufferPageId quand bufferPageId est défini', () => {
    const f = setup(makePreviewMessage());
    let emitted: string | undefined;
    f.componentInstance.previewRejected.subscribe((v) => (emitted = v));
    f.componentInstance.onPreviewRejected();
    expect(emitted).toBe('buf-001');
  });

  it("n'émet pas previewRejected quand bufferPageId est absent", () => {
    const f = setup(makeMessage({ role: 'assistant' }));
    let emitted = false;
    f.componentInstance.previewRejected.subscribe(() => (emitted = true));
    f.componentInstance.onPreviewRejected();
    expect(emitted).toBeFalse();
  });
});

// ── Input isAiLoading ─────────────────────────────────────────────────────────

describe('BubbleMessageComponent — isAiLoading', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('isAiLoading vaut false par défaut', () => {
    const f = setup(makeMessage());
    expect(f.componentInstance.isAiLoading).toBeFalse();
  });

  it('isAiLoading est bien bindé à true', () => {
    const f = setup(makeMessage());
    f.componentInstance.isAiLoading = true;
    expect(f.componentInstance.isAiLoading).toBeTrue();
  });
});

// ── Rendu preview-card ────────────────────────────────────────────────────────

describe('BubbleMessageComponent — rendu app-preview-card', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('affiche app-preview-card quand isPreviewMessage est true', () => {
    const f = setup(makePreviewMessage());
    const card = f.debugElement.query(By.css('app-preview-card'));
    expect(card).not.toBeNull();
  });

  it("n'affiche pas app-preview-card quand isPreviewMessage est false", () => {
    const f = setup(makeMessage({ role: 'assistant', content: 'Pas de preview' }));
    const card = f.debugElement.query(By.css('app-preview-card'));
    expect(card).toBeNull();
  });
});
