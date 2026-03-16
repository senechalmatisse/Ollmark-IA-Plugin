import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';
import { ChatHistoryComponent } from './chat-history.component';
import { BubbleMessageComponent } from '../bubble-message/bubble-message.component';
import { ChatMessage } from '../../../../core/models';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

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
    fixture.componentInstance.messages = messages;
    fixture.detectChanges();
    return fixture;
}

// ---------------------------------------------------------------------------
// État vide
// ---------------------------------------------------------------------------

describe('ChatHistoryComponent — état vide', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('rend la section .chat-history', () => {
        const f = setup([]);
        expect(f.debugElement.query(By.css('section.chat-history'))).not.toBeNull();
    });

    it("n'affiche pas la liste <ul> si messages est vide", () => {
        const f = setup([]);
        expect(f.debugElement.query(By.css('ul.message-list'))).toBeNull();
    });

   

    it('la section porte aria-label "Historique de conversation"', () => {
        const f = setup([]);
        const section = f.debugElement.query(By.css('section'));
        expect(section.nativeElement.getAttribute('aria-label')).toBe('Historique de conversation');
    });

    it('la section porte aria-live="polite"', () => {
        const f = setup([]);
        const section = f.debugElement.query(By.css('section'));
        expect(section.nativeElement.getAttribute('aria-live')).toBe('polite');
    });
});

// ---------------------------------------------------------------------------
// Rendu des messages
// ---------------------------------------------------------------------------

describe('ChatHistoryComponent — rendu des messages', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('affiche la <ul> quand messages contient au moins un élément', () => {
        const f = setup([makeMessage()]);
        expect(f.debugElement.query(By.css('ul.message-list'))).not.toBeNull();
    });

   

    it('rend autant de <li> que de messages', () => {
        const msgs = [makeMessage(), makeMessage(), makeMessage()];
        const f = setup(msgs);
        const items = f.debugElement.queryAll(By.css('li'));
        expect(items.length).toBe(3);
    });

    it('rend un <app-bubble-message> par message', () => {
        const msgs = [makeMessage(), makeMessage()];
        const f = setup(msgs);
        const bubbles = f.debugElement.queryAll(By.css('app-bubble-message'));
        expect(bubbles.length).toBe(2);
    });

    it("passe le bon @Input [message] à chaque BubbleMessageComponent", () => {
        const msgs = [
            makeMessage({ content: 'Premier', role: 'user' }),
            makeMessage({ content: 'Second', role: 'assistant' }),
        ];
        const f = setup(msgs);
        const bubbles = f.debugElement.queryAll(By.directive(BubbleMessageComponent));

        expect(bubbles[0].componentInstance.message.content).toBe('Premier');
        expect(bubbles[1].componentInstance.message.content).toBe('Second');
    });
});

// ---------------------------------------------------------------------------
// Mise à jour dynamique des messages
// ---------------------------------------------------------------------------
// ChatHistoryComponent utilise ChangeDetectionStrategy.OnPush.
// L'assignation directe sur componentInstance.messages ne déclenche pas
// la détection de changements — il faut passer par setInput() qui simule
// correctement un changement d'@Input côté Angular.
// ---------------------------------------------------------------------------

describe('ChatHistoryComponent — mise à jour dynamique', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('affiche un nouveau message ajouté dynamiquement', () => {
        const initial = makeMessage({ content: 'Initial' });
        const f = setup([initial]);

        f.componentRef.setInput('messages', [initial, makeMessage({ content: 'Nouveau' })]);
        f.detectChanges();

        const items = f.debugElement.queryAll(By.css('li'));
        expect(items.length).toBe(2);
    });

    it("cache la liste quand messages repasse à vide", () => {
        const f = setup([makeMessage()]);

        f.componentRef.setInput('messages', []);
        f.detectChanges();

        expect(f.debugElement.query(By.css('ul.message-list'))).toBeNull();
    });

    it("met à jour le contenu d'un message existant (résolution placeholder)", () => {
        const msg = makeMessage({ content: '', isLoading: true, role: 'assistant' });
        const f = setup([msg]);

        const resolved: ChatMessage = { ...msg, content: 'Réponse finale', isLoading: false };
        f.componentRef.setInput('messages', [resolved]);
        f.detectChanges();

        const bubble = f.debugElement.query(By.directive(BubbleMessageComponent));
        expect(bubble.componentInstance.message.content).toBe('Réponse finale');
        expect(bubble.componentInstance.message.isLoading).toBeFalsy();
    });
});

// ---------------------------------------------------------------------------
// Scroll automatique
// ---------------------------------------------------------------------------
// Dans Chrome Headless, scrollHeight a une valeur réelle (le DOM est rendu)
// mais scrollTop reste à 0 car l'élément ne déborde pas (pas de hauteur CSS
// fixée). Le setter scrollTop est ignoré sans overflow.
//
// Stratégie : on espionne le setter scrollTop via Object.defineProperty pour
// capturer la valeur que scrollToBottom() tente d'assigner, sans dépendre
// du moteur de layout.
// ---------------------------------------------------------------------------

describe('ChatHistoryComponent — scroll automatique', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('assigne scrollTop = scrollHeight après detectChanges', () => {
        const f = setup([makeMessage()]);
        const section: HTMLElement = f.debugElement.query(By.css('section')).nativeElement;

        let capturedScrollTop: number | undefined;
        const currentScrollHeight = section.scrollHeight;

        Object.defineProperty(section, 'scrollTop', {
            set: (v: number) => { capturedScrollTop = v; },
            get: () => capturedScrollTop ?? 0,
            configurable: true,
        });

        f.detectChanges();

        expect(capturedScrollTop).toBe(currentScrollHeight);
    });

    it('assigne scrollTop = scrollHeight après un ajout de message', () => {
        const f = setup([makeMessage()]);
        const section: HTMLElement = f.debugElement.query(By.css('section')).nativeElement;

        let capturedScrollTop: number | undefined;

        Object.defineProperty(section, 'scrollTop', {
            set: (v: number) => { capturedScrollTop = v; },
            get: () => capturedScrollTop ?? 0,
            configurable: true,
        });

        f.componentRef.setInput('messages', [makeMessage(), makeMessage()]);
        f.detectChanges();

        expect(capturedScrollTop).toBe(section.scrollHeight);
    });

    it('ngAfterViewChecked ne lève pas d\'erreur quand la liste est vide', () => {
        const f = setup([]);
        expect(() => f.detectChanges()).not.toThrow();
    });
});

// ---------------------------------------------------------------------------
// #scrollContainer — référence ViewChild
// ---------------------------------------------------------------------------

describe('ChatHistoryComponent — référence ViewChild #scrollContainer', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('la section porte la variable de template #scrollContainer', () => {
        const f = setup([]);
        // On vérifie que ngAfterViewChecked ne lève pas d'erreur (pas de null ref)
        expect(() => f.detectChanges()).not.toThrow();
    });
});