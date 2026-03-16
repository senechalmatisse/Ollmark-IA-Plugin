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
// Classes CSS — wrapper
// ---------------------------------------------------------------------------

describe('BubbleMessageComponent — classes wrapper', () => {
    afterEach(() => TestBed.resetTestingModule());

    it("ajoute 'wrapper--user' pour un message utilisateur", () => {
        const f = setup(makeMessage({ role: 'user' }));
        const wrapper = f.debugElement.query(By.css('.wrapper'));
        expect(wrapper.classes['wrapper--user']).toBeTrue();
        expect(wrapper.classes['wrapper--assistant']).toBeFalsy();
    });

    it("ajoute 'wrapper--assistant' pour un message assistant", () => {
        const f = setup(makeMessage({ role: 'assistant', content: 'Bonjour' }));
        const wrapper = f.debugElement.query(By.css('.wrapper'));
        expect(wrapper.classes['wrapper--assistant']).toBeTrue();
        expect(wrapper.classes['wrapper--user']).toBeFalsy();
    });
});

// ---------------------------------------------------------------------------
// Classes CSS — bulle
// ---------------------------------------------------------------------------

describe('BubbleMessageComponent — classes bubble', () => {
    afterEach(() => TestBed.resetTestingModule());

    it("ajoute 'bubble--user' pour un message utilisateur", () => {
        const f = setup(makeMessage({ role: 'user' }));
        const bubble = f.debugElement.query(By.css('.bubble'));
        expect(bubble.classes['bubble--user']).toBeTrue();
        expect(bubble.classes['bubble--assistant']).toBeFalsy();
    });

    it("ajoute 'bubble--assistant' pour un message assistant", () => {
        const f = setup(makeMessage({ role: 'assistant', content: 'OK' }));
        const bubble = f.debugElement.query(By.css('.bubble'));
        expect(bubble.classes['bubble--assistant']).toBeTrue();
        expect(bubble.classes['bubble--user']).toBeFalsy();
    });

    it("ajoute 'bubble--error' quand isError est true", () => {
        const f = setup(makeMessage({ role: 'assistant', isError: true, content: 'Erreur' }));
        const bubble = f.debugElement.query(By.css('.bubble'));
        expect(bubble.classes['bubble--error']).toBeTrue();
    });

    it("n'ajoute pas 'bubble--error' quand isError est absent", () => {
        const f = setup(makeMessage({ role: 'user' }));
        const bubble = f.debugElement.query(By.css('.bubble'));
        expect(bubble.classes['bubble--error']).toBeFalsy();
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

    it("contient 'IA' pour un message assistant", () => {
        const f = setup(makeMessage({ role: 'assistant', content: 'OK' }));
        const bubble = f.debugElement.query(By.css('.bubble'));
        const ariaLabel: string = bubble.nativeElement.getAttribute('aria-label');
        expect(ariaLabel).toContain('IA');
    });
});

// ---------------------------------------------------------------------------
// Avatar — affiché uniquement pour l'assistant
// ---------------------------------------------------------------------------

describe('BubbleMessageComponent — avatar', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('affiche le div avatar pour un message assistant', () => {
        const f = setup(makeMessage({ role: 'assistant', content: 'Bonjour' }));
        const avatar = f.debugElement.query(By.css('.avatar'));
        expect(avatar).not.toBeNull();
    });

    it("n'affiche pas le div avatar pour un message utilisateur", () => {
        const f = setup(makeMessage({ role: 'user' }));
        const avatar = f.debugElement.query(By.css('.avatar'));
        expect(avatar).toBeNull();
    });

    it("ajoute 'main--ai' pour un message assistant", () => {
        const f = setup(makeMessage({ role: 'assistant', content: 'OK' }));
        expect(f.debugElement.query(By.css('.main--ai'))).not.toBeNull();
    });

    it("n'ajoute pas 'main--ai' pour un message utilisateur", () => {
        const f = setup(makeMessage({ role: 'user' }));
        expect(f.debugElement.query(By.css('.main--ai'))).toBeNull();
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
        expect(f.debugElement.query(By.css('p.text'))).toBeNull();
    });

    it('affiche le paragraphe de texte et cache .dots quand isLoading=false', () => {
        const f = setup(makeMessage({ role: 'assistant', content: 'Réponse finale' }));
        expect(f.debugElement.query(By.css('p.text'))).not.toBeNull();
        expect(f.debugElement.query(By.css('.dots'))).toBeNull();
    });

    it('le div .dots porte aria-label "En cours de génération…"', () => {
        const f = setup(makeMessage({ role: 'assistant', content: '', isLoading: true }));
        const dots = f.debugElement.query(By.css('.dots'));
        expect(dots.nativeElement.getAttribute('aria-label')).toBe('En cours de génération…');
    });
});

// ---------------------------------------------------------------------------
// Contenu textuel
// ---------------------------------------------------------------------------

describe('BubbleMessageComponent — contenu textuel', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('affiche le contenu dans le paragraphe .text', () => {
        const f = setup(makeMessage({ role: 'user', content: 'Mon message ici' }));
        const p = f.debugElement.query(By.css('p.text'));
        expect(p.nativeElement.textContent.trim()).toBe('Mon message ici');
    });

    it('affiche le contenu de la réponse assistant', () => {
        const f = setup(makeMessage({ role: 'assistant', content: 'Voici la réponse.' }));
        const p = f.debugElement.query(By.css('p.text'));
        expect(p.nativeElement.textContent.trim()).toBe('Voici la réponse.');
    });

    it('affiche le message d\'erreur dans .text quand isError=true', () => {
        const f = setup(makeMessage({ role: 'assistant', content: 'Erreur réseau', isError: true }));
        const p = f.debugElement.query(By.css('p.text'));
        expect(p.nativeElement.textContent.trim()).toBe('Erreur réseau');
    });
});

// ---------------------------------------------------------------------------
// Horodatage <time>
// ---------------------------------------------------------------------------

describe('BubbleMessageComponent — horodatage', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('affiche un élément <time> dans la bulle', () => {
        const f = setup(makeMessage());
        expect(f.debugElement.query(By.css('time'))).not.toBeNull();
    });

    it('l\'attribut dateTime contient l\'ISO string du timestamp', () => {
        const ts = new Date('2026-03-15T10:30:00.000Z');
        const f = setup(makeMessage({ timestamp: ts }));
        const time = f.debugElement.query(By.css('time'));
        expect(time.nativeElement.getAttribute('datetime')).toBe(ts.toISOString());
    });

    it('le texte affiché dans <time> est au format HH:MM', () => {
        const f = setup(makeMessage({ timestamp: new Date('2026-03-15T10:30:00.000Z') }));
        const time = f.debugElement.query(By.css('time'));
        expect(time.nativeElement.textContent.trim()).toMatch(/^\d{2}:\d{2}$/);
    });
});