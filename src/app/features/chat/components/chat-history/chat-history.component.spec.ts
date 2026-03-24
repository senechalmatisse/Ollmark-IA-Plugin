import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ChatHistoryComponent } from './chat-history.component';
import { BubbleMessageComponent } from '../bubble-message/bubble-message.component';
import { ChatMessage } from '../../../../core/models';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: 'user',
    content: 'Hello',
    timestamp: new Date(),
    ...overrides,
  };
}

function setup(messages: ChatMessage[] = []): ComponentFixture<ChatHistoryComponent> {
  TestBed.configureTestingModule({
    imports: [ChatHistoryComponent, BubbleMessageComponent],
  });
  const fixture = TestBed.createComponent(ChatHistoryComponent);
  // setInput déclenche ngOnChanges correctement sur OnPush
  fixture.componentRef.setInput('messages', messages);
  fixture.detectChanges();
  fixture.detectChanges();
  return fixture;
}

function makeNearBottomSection(section: HTMLElement): { capturedScrollTop: number | undefined } {
  const capture = { capturedScrollTop: undefined as number | undefined };
  Object.defineProperty(section, 'scrollHeight', { get: () => 1000, configurable: true });
  Object.defineProperty(section, 'clientHeight', { get: () => 300, configurable: true });
  Object.defineProperty(section, 'scrollTop', {
    get: () => capture.capturedScrollTop ?? 700,
    set: (v: number) => {
      capture.capturedScrollTop = v;
    },
    configurable: true,
  });
  return capture;
}

// ── Création ──────────────────────────────────────────────────────────────────

describe('ChatHistoryComponent — création', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('should create', () => {
    const f = setup([]);
    expect(f.componentInstance).toBeTruthy();
  });
});

// ── Structure HTML ────────────────────────────────────────────────────────────

describe('ChatHistoryComponent — structure HTML', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('rend la section .chat-history', () => {
    const f = setup([]);
    expect(f.debugElement.query(By.css('section.chat-history'))).not.toBeNull();
  });

  it('la section porte aria-label "Historique de conversation"', () => {
    const f = setup([]);
    const section = f.debugElement.query(By.css('section.chat-history'));
    expect(section.nativeElement.getAttribute('aria-label')).toBe('Historique de conversation');
  });
});

// ── hasMessages getter ────────────────────────────────────────────────────────

describe('ChatHistoryComponent — hasMessages', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('retourne false quand messages est vide', () => {
    const f = setup([]);
    expect((f.componentInstance as unknown as { hasMessages: boolean }).hasMessages).toBeFalse();
  });

  it('retourne true quand messages contient au moins un élément', () => {
    const f = setup([makeMessage()]);
    expect((f.componentInstance as unknown as { hasMessages: boolean }).hasMessages).toBeTrue();
  });
});

// ── État vide ─────────────────────────────────────────────────────────────────

describe('ChatHistoryComponent — état vide', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('affiche .empty-state-card quand messages est vide', () => {
    const f = setup([]);
    expect(f.debugElement.query(By.css('.empty-state-card'))).not.toBeNull();
  });

  it("n'affiche pas app-bubble-message quand messages est vide", () => {
    const f = setup([]);
    expect(f.debugElement.query(By.css('app-bubble-message'))).toBeNull();
  });
});

// ── Rendu des messages ────────────────────────────────────────────────────────

describe('ChatHistoryComponent — rendu des messages', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('cache .empty-state-card quand messages contient au moins un élément', () => {
    const f = setup([makeMessage()]);
    expect(f.debugElement.query(By.css('.empty-state-card'))).toBeNull();
  });

  it('rend un app-bubble-message par message', () => {
    const f = setup([makeMessage(), makeMessage()]);
    expect(f.debugElement.queryAll(By.css('app-bubble-message')).length).toBe(2);
  });

  it('passe le bon @Input [message] à chaque BubbleMessageComponent', () => {
    const msgs = [
      makeMessage({ content: 'Premier', role: 'user' }),
      makeMessage({ content: 'Second', role: 'assistant' }),
    ];
    const f = setup(msgs);
    const bubbles = f.debugElement.queryAll(By.directive(BubbleMessageComponent));
    expect(bubbles[0].componentInstance.message.content).toBe('Premier');
    expect(bubbles[1].componentInstance.message.content).toBe('Second');
  });

  it('passe isAiLoading au BubbleMessageComponent', () => {
    const f = setup([makeMessage()]);
    // setInput requis pour déclencher ngOnChanges sur OnPush
    f.componentRef.setInput('isAiLoading', true);
    f.detectChanges();
    const bubble = f.debugElement.query(By.directive(BubbleMessageComponent));
    expect(bubble.componentInstance.isAiLoading).toBeTrue();
  });
});

// ── Mise à jour dynamique ─────────────────────────────────────────────────────

describe('ChatHistoryComponent — mise à jour dynamique', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('affiche un nouveau message ajouté dynamiquement', () => {
    const initial = makeMessage({ content: 'Initial' });
    const f = setup([initial]);
    expect(f.debugElement.queryAll(By.css('app-bubble-message')).length).toBe(1);

    f.componentRef.setInput('messages', [initial, makeMessage({ content: 'Nouveau' })]);
    f.detectChanges();
    expect(f.debugElement.queryAll(By.css('app-bubble-message')).length).toBe(2);
  });

  it('réaffiche .empty-state-card quand messages repasse à vide', () => {
    const f = setup([makeMessage()]);
    f.componentRef.setInput('messages', []);
    f.detectChanges();
    expect(f.debugElement.query(By.css('.empty-state-card'))).not.toBeNull();
    expect(f.debugElement.query(By.css('app-bubble-message'))).toBeNull();
  });

  it('met à jour le contenu quand un message existant est modifié', () => {
    const msg = makeMessage({ content: '', isLoading: true, role: 'assistant' });
    const f = setup([msg]);
    f.componentRef.setInput('messages', [{ ...msg, content: 'Réponse finale', isLoading: false }]);
    f.detectChanges();
    const bubble = f.debugElement.query(By.directive(BubbleMessageComponent));
    expect(bubble.componentInstance.message.content).toBe('Réponse finale');
    expect(bubble.componentInstance.message.isLoading).toBeFalsy();
  });
});

// ── Outputs ───────────────────────────────────────────────────────────────────

describe('ChatHistoryComponent — outputs', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('propage previewAccepted depuis BubbleMessageComponent', () => {
    const f = setup([
      makeMessage({
        role: 'assistant',
        bufferPageId: 'buf-001',
        previewStatus: 'pending',
        previewPngUrl: 'data:image/png;base64,abc',
        previewCode: 'code',
      }),
    ]);
    let emitted: { bufferPageId: string; code: string } | undefined;
    f.componentInstance.previewAccepted.subscribe((v) => (emitted = v));
    f.debugElement
      .query(By.directive(BubbleMessageComponent))
      .componentInstance.previewAccepted.emit({ bufferPageId: 'buf-001', code: 'code' });
    expect(emitted).toEqual({ bufferPageId: 'buf-001', code: 'code' });
  });

  it('propage previewRejected depuis BubbleMessageComponent', () => {
    const f = setup([
      makeMessage({
        role: 'assistant',
        bufferPageId: 'buf-001',
        previewStatus: 'pending',
        previewPngUrl: 'data:image/png;base64,abc',
      }),
    ]);
    let emitted: string | undefined;
    f.componentInstance.previewRejected.subscribe((v) => (emitted = v));
    f.debugElement
      .query(By.directive(BubbleMessageComponent))
      .componentInstance.previewRejected.emit('buf-001');
    expect(emitted).toBe('buf-001');
  });
});

// ── Scroll automatique ────────────────────────────────────────────────────────

describe('ChatHistoryComponent — scroll automatique', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('scroll vers le bas après un ajout de message quand near bottom', fakeAsync(() => {
    const f = setup([makeMessage()]);
    tick(50); // vide le timer déclenché par le setup initial (1 > 0)

    const section: HTMLElement = f.debugElement.query(By.css('section.chat-history')).nativeElement;
    const capture = makeNearBottomSection(section);

    f.componentRef.setInput('messages', [makeMessage(), makeMessage()]);
    f.detectChanges();
    tick(50);

    expect(capture.capturedScrollTop).toBe(1000);
  }));

  it('ne scroll pas quand on retire des messages (count ne croît pas)', fakeAsync(() => {
    const msgs = [makeMessage(), makeMessage()];
    const f = setup(msgs);
    tick(50); // vide le timer du setup initial (2 > 0)

    const section: HTMLElement = f.debugElement.query(By.css('section.chat-history')).nativeElement;
    const capture = makeNearBottomSection(section);
    capture.capturedScrollTop = undefined;

    f.componentRef.setInput('messages', [msgs[0]]); // 1 < 2 → pas de scroll
    f.detectChanges();
    tick(50);

    expect(capture.capturedScrollTop).toBeUndefined();
  }));

  it("ne lève pas d'erreur quand la liste est vide", fakeAsync(() => {
    const f = setup([]);
    expect(() => {
      f.detectChanges();
      tick(50);
    }).not.toThrow();
  }));
});

// ── ViewChild _scrollContainer ────────────────────────────────────────────────

describe('ChatHistoryComponent — ViewChild _scrollContainer', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('_scrollContainer est lié à la section.chat-history', () => {
    const f = setup([]);
    const ref = (
      f.componentInstance as unknown as { _scrollContainer: { nativeElement: HTMLElement } }
    )._scrollContainer;
    expect(ref).toBeDefined();
    expect(ref.nativeElement.classList.contains('chat-history')).toBeTrue();
  });
});
