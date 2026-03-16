import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { BubbleMessageComponent } from './bubble-message.component';
import { ChatMessage } from '../../../../core/models';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
    return {
        id: 'test-id-001',
        role: 'user',
        content: 'Hello world',
        timestamp: new Date('2026-03-15T10:30:00.000Z'),
        ...overrides,
    };
}

function setup(msg: ChatMessage): ComponentFixture<BubbleMessageComponent> {
    TestBed.configureTestingModule({
        imports: [BubbleMessageComponent],
    });
    const fixture = TestBed.createComponent(BubbleMessageComponent);
    fixture.componentInstance.message = msg;
    fixture.detectChanges();
    return fixture;
}

// ---------------------------------------------------------------------------
// Héritage — accesseurs hérités de MessageComponent
// ---------------------------------------------------------------------------

describe('BubbleMessageComponent — héritage de MessageComponent', () => {
    afterEach(() => TestBed.resetTestingModule());

    it("isUser retourne true pour role='user'", () => {
        const f = setup(makeMessage({ role: 'user' }));
        expect(f.componentInstance.isUser).toBeTrue();
    });

    it("isAssistant retourne true pour role='assistant'", () => {
        const f = setup(makeMessage({ role: 'assistant' }));
        expect(f.componentInstance.isAssistant).toBeTrue();
    });

    it("senderLabel vaut 'Vous' pour un message utilisateur", () => {
        const f = setup(makeMessage({ role: 'user' }));
        expect(f.componentInstance.senderLabel).toBe('Vous');
    });

    it("senderLabel vaut 'IA' pour un message assistant", () => {
        const f = setup(makeMessage({ role: 'assistant' }));
        expect(f.componentInstance.senderLabel).toBe('IA');
    });

    it('formattedTime retourne une chaîne HH:MM', () => {
        const f = setup(makeMessage());
        expect(f.componentInstance.formattedTime).toMatch(/^\d{2}:\d{2}$/);
    });
});

// ---------------------------------------------------------------------------
// Classes CSS — bubble-wrapper
// ---------------------------------------------------------------------------

describe('BubbleMessageComponent — classes bubble-wrapper', () => {
    afterEach(() => TestBed.resetTestingModule());

    it("ajoute la classe 'user' pour un message utilisateur", () => {
        const f = setup(makeMessage({ role: 'user' }));
        const wrapper = f.debugElement.query(By.css('.bubble-wrapper'));
        expect(wrapper.classes['user']).toBeTrue();
        expect(wrapper.classes['ai']).toBeFalsy();
    });

    it("ajoute la classe 'ai' pour un message assistant", () => {
        const f = setup(makeMessage({ role: 'assistant', content: 'Bonjour' }));
        const wrapper = f.debugElement.query(By.css('.bubble-wrapper'));
        expect(wrapper.classes['ai']).toBeTrue();
        expect(wrapper.classes['user']).toBeFalsy();
    });
});

// ---------------------------------------------------------------------------
// Classes CSS — bulle
// ---------------------------------------------------------------------------

describe('BubbleMessageComponent — classes bubble', () => {
    afterEach(() => TestBed.resetTestingModule());

    // Note: Dans ton nouveau CSS, les couleurs sont gérées par le parent .user/.ai
    // Mais on vérifie quand même les classes spécifiques d'état.

    it("ajoute 'bubble--error' quand isError est true", () => {
        const f = setup(makeMessage({ role: 'assistant', isError: true, content: 'Erreur' }));
        const bubble = f.debugElement.query(By.css('.bubble'));
        expect(bubble.classes['bubble--error']).toBeTrue();
    });
});

// ---------------------------------------------------------------------------
// aria-label de la bulle
// ---------------------------------------------------------------------------

describe('BubbleMessageComponent — aria-label', () => {
    afterEach(() => TestBed.resetTestingModule());

    it("contient 'Vous' et le formattedTime pour un message utilisateur", () => {
        const f = setup(makeMessage({ role: 'user' }));
        const bubble = f.debugElement.query(By.css('.bubble'));
        const ariaLabel: string = bubble.nativeElement.getAttribute('aria-label');
        expect(ariaLabel).toContain('Vous');
        expect(ariaLabel).toContain('·');
        expect(ariaLabel).toMatch(/\d{2}:\d{2}/);
    });
});

// ---------------------------------------------------------------------------
// Avatar — affiché uniquement pour l'assistant
// ---------------------------------------------------------------------------

describe('BubbleMessageComponent — avatar', () => {
    afterEach(() => TestBed.resetTestingModule());

    it("affiche l'image ai-inline-icon pour un message assistant", () => {
        const f = setup(makeMessage({ role: 'assistant', content: 'Bonjour' }));
        const icon = f.debugElement.query(By.css('.ai-inline-icon'));
        expect(icon).not.toBeNull();
    });

    it("n'affiche pas l'image ai-inline-icon pour un message utilisateur", () => {
        const f = setup(makeMessage({ role: 'user' }));
        const icon = f.debugElement.query(By.css('.ai-inline-icon'));
        expect(icon).toBeNull();
    });

    it("ajoute 'ai-main' pour un message assistant", () => {
        const f = setup(makeMessage({ role: 'assistant', content: 'OK' }));
        const main = f.debugElement.query(By.css('.bubble-main'));
        expect(main.classes['ai-main']).toBeTrue();
    });
});

// ---------------------------------------------------------------------------
// État de chargement
// ---------------------------------------------------------------------------

describe('BubbleMessageComponent — état isLoading', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('affiche le div .dots et cache le paragraphe quand isLoading=true', () => {
        const f = setup(makeMessage({ role: 'assistant', content: '', isLoading: true }));
        expect(f.debugElement.query(By.css('.dots'))).not.toBeNull();
        expect(f.debugElement.query(By.css('p.content'))).toBeNull();
    });

    it('affiche le paragraphe de texte et cache .dots quand isLoading=false', () => {
        const f = setup(makeMessage({ role: 'assistant', content: 'Réponse finale' }));
        expect(f.debugElement.query(By.css('p.content'))).not.toBeNull();
        expect(f.debugElement.query(By.css('.dots'))).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Contenu textuel
// ---------------------------------------------------------------------------

describe('BubbleMessageComponent — contenu textuel', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('affiche le contenu dans le paragraphe .content', () => {
        const f = setup(makeMessage({ role: 'user', content: 'Mon message ici' }));
        const p = f.debugElement.query(By.css('p.content'));
        expect(p.nativeElement.textContent.trim()).toBe('Mon message ici');
    });
});

// ---------------------------------------------------------------------------
// Horodatage <time>
// ---------------------------------------------------------------------------

describe('BubbleMessageComponent — horodatage', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('affiche un élément <time> avec la classe .timestamp', () => {
        const f = setup(makeMessage());
        expect(f.debugElement.query(By.css('time.timestamp'))).not.toBeNull();
    });

    it('l\'attribut dateTime contient l\'ISO string du timestamp', () => {
        const ts = new Date('2026-03-15T10:30:00.000Z');
        const f = setup(makeMessage({ timestamp: ts }));
        const time = f.debugElement.query(By.css('time'));
        expect(time.nativeElement.getAttribute('datetime')).toBe(ts.toISOString());
    });
});