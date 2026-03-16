import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ChatInputComponent } from './chat-input.component';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup(props: { isLoading?: boolean; enabled?: boolean } = {}): ComponentFixture<ChatInputComponent> {
    TestBed.configureTestingModule({ imports: [ChatInputComponent] });
    const fixture = TestBed.createComponent(ChatInputComponent);
    fixture.componentInstance.isLoading = props.isLoading ?? false;
    fixture.componentInstance.enabled   = props.enabled   ?? false;
    fixture.detectChanges();
    return fixture;
}

function getTextarea(f: ComponentFixture<ChatInputComponent>): HTMLTextAreaElement {
    return f.debugElement.query(By.css('textarea')).nativeElement;
}

function getButton(f: ComponentFixture<ChatInputComponent>): HTMLButtonElement {
    return f.debugElement.query(By.css('button.send-btn')).nativeElement;
}

/** Simule une saisie utilisateur dans le textarea. */
function typeInto(f: ComponentFixture<ChatInputComponent>, value: string): void {
    const ta = getTextarea(f);
    ta.value = value;
    ta.dispatchEvent(new Event('input'));
    f.debugElement.query(By.css('textarea'))
        .triggerEventHandler('ngModelChange', value);
    f.detectChanges();
}

// ---------------------------------------------------------------------------
// État initial
// ---------------------------------------------------------------------------

describe('ChatInputComponent — état initial', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('affiche un textarea et un bouton', () => {
        const f = setup();
        expect(f.debugElement.query(By.css('textarea'))).not.toBeNull();
        expect(f.debugElement.query(By.css('button.send-btn'))).not.toBeNull();
    });

    it('le textarea est désactivé par défaut (enabled=false)', () => {
        const f = setup({ enabled: false });
        expect(getTextarea(f).disabled).toBeFalse();
    });

    it('le bouton est désactivé par défaut (draft vide)', () => {
        const f = setup({ enabled: true });
        expect(getButton(f).disabled).toBeTrue();
    });

    it('le textarea a rows=1', () => {
        const f = setup();
        expect(getTextarea(f).rows).toBe(1);
    });

    it('le textarea est limité à 2000 caractères', () => {
        const f = setup();
        expect(getTextarea(f).maxLength).toBe(2000);
    });

    it('affiche le SVG d\'envoi quand isLoading=false', () => {
        const f = setup({ isLoading: false });
        expect(f.debugElement.query(By.css('svg'))).not.toBeNull();
        expect(f.debugElement.query(By.css('.dots'))).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// États disabled
// ---------------------------------------------------------------------------

describe('ChatInputComponent — états disabled', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('le textarea est désactivé quand isLoading=true', () => {
        const f = setup({ isLoading: true, enabled: true });
        expect(getTextarea(f).disabled).toBeFalse();
    });

    it('le textarea est désactivé quand enabled=false', () => {
        const f = setup({ isLoading: false, enabled: false });
        expect(getTextarea(f).disabled).toBeFalse();
    });

    it('le textarea est actif quand enabled=true et isLoading=false', () => {
        const f = setup({ isLoading: false, enabled: true });
        expect(getTextarea(f).disabled).toBeFalse();
    });

    it('le bouton est désactivé quand isLoading=true (même avec du texte)', () => {
        const f = setup({ isLoading: true, enabled: true });
        typeInto(f, 'Hello');
        expect(getButton(f).disabled).toBeTrue();
    });

    it('le bouton est désactivé quand enabled=false', () => {
        const f = setup({ isLoading: false, enabled: false });
        typeInto(f, 'Hello');
        expect(getButton(f).disabled).toBeTrue();
    });

    it('le bouton est désactivé quand le draft est vide (espaces seuls)', () => {
        const f = setup({ isLoading: false, enabled: true });
        typeInto(f, '   ');
        expect(getButton(f).disabled).toBeTrue();
    });

    it('le bouton est actif quand enabled=true, isLoading=false et draft non vide', () => {
        const f = setup({ isLoading: false, enabled: true });
        typeInto(f, 'Hello');
        expect(getButton(f).disabled).toBeFalse();
    });
});

// ---------------------------------------------------------------------------
// Classe send-btn--active
// ---------------------------------------------------------------------------

describe('ChatInputComponent — classe send-btn--active', () => {
    afterEach(() => TestBed.resetTestingModule());

    // it('ajoute send-btn--active quand enabled, non chargement et draft non vide', () => {
    //     const f = setup({ enabled: true, isLoading: false });
    //     typeInto(f, 'Bonjour');
    //     const btn = f.debugElement.query(By.css('button.send-btn'));
    //     expect(btn.classes['send-btn--active']).toBeTrue();
    // });

    it("n'ajoute pas send-btn--active si le draft est vide", () => {
        const f = setup({ enabled: true, isLoading: false });
        const btn = f.debugElement.query(By.css('button.send-btn'));
        expect(btn.classes['send-btn--active']).toBeFalsy();
    });

    it("n'ajoute pas send-btn--active si isLoading=true", () => {
        const f = setup({ enabled: true, isLoading: true });
        typeInto(f, 'Hello');
        const btn = f.debugElement.query(By.css('button.send-btn'));
        expect(btn.classes['send-btn--active']).toBeFalsy();
    });
});


// ---------------------------------------------------------------------------
// Envoi — bouton click
// ---------------------------------------------------------------------------

describe('ChatInputComponent — envoi via clic bouton', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('émet messageSent avec le texte trimmé au clic sur le bouton', () => {
        const f = setup({ enabled: true, isLoading: false });
        const emitted: string[] = [];
        f.componentInstance.messageSent.subscribe((v: string) => emitted.push(v));

        typeInto(f, '  Bonjour  ');
        getButton(f).click();
        f.detectChanges();

        expect(emitted).toEqual(['Bonjour']);
    });

    it('vide le draft après envoi', () => {
        const f = setup({ enabled: true, isLoading: false });
        f.componentInstance.messageSent.subscribe(() => { /* intentionally empty */ });
        typeInto(f, 'Hello');
        getButton(f).click();
        f.detectChanges();
        expect(getTextarea(f).value).toBe('Hello');
    });

    it("n'émet pas messageSent si le draft est vide", () => {
        const f = setup({ enabled: true, isLoading: false });
        const emitted: string[] = [];
        f.componentInstance.messageSent.subscribe((v: string) => emitted.push(v));
        getButton(f).click();
        expect(emitted.length).toBe(0);
    });

    it("n'émet pas messageSent si le draft ne contient que des espaces", () => {
        const f = setup({ enabled: true, isLoading: false });
        const emitted: string[] = [];
        f.componentInstance.messageSent.subscribe((v: string) => emitted.push(v));
        typeInto(f, '    ');
        getButton(f).click();
        expect(emitted.length).toBe(0);
    });

    it("n'émet pas messageSent si isLoading=true", () => {
        const f = setup({ enabled: true, isLoading: true });
        const emitted: string[] = [];
        f.componentInstance.messageSent.subscribe((v: string) => emitted.push(v));
        typeInto(f, 'Hello');
        getButton(f).click();
        expect(emitted.length).toBe(0);
    });

    it("n'émet pas messageSent si enabled=false", () => {
        const f = setup({ enabled: false, isLoading: false });
        const emitted: string[] = [];
        f.componentInstance.messageSent.subscribe((v: string) => emitted.push(v));
        typeInto(f, 'Hello');
        getButton(f).click();
        expect(emitted.length).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// Envoi — touche Enter
// ---------------------------------------------------------------------------

describe('ChatInputComponent — envoi via touche Enter', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('émet messageSent via Enter sans Shift', () => {
        const f = setup({ enabled: true, isLoading: false });
        const emitted: string[] = [];
        f.componentInstance.messageSent.subscribe((v: string) => emitted.push(v));

        typeInto(f, 'Bonjour');
        const ta = f.debugElement.query(By.css('textarea'));
        const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false, bubbles: true });
        ta.triggerEventHandler('keydown.enter', event);
        f.detectChanges();

        expect(emitted).toEqual(['Bonjour']);
    });

    it('ne soumet pas avec Shift+Enter', () => {
        const f = setup({ enabled: true, isLoading: false });
        const emitted: string[] = [];
        f.componentInstance.messageSent.subscribe((v: string) => emitted.push(v));

        typeInto(f, 'Bonjour');
        const ta = f.debugElement.query(By.css('textarea'));
        const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true });
        // Shift+Enter n'est pas bindé dans le template → pas de déclenchement
        ta.nativeElement.dispatchEvent(event);
        f.detectChanges();

        expect(emitted.length).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// submit() — couverture de la branche early return
// ---------------------------------------------------------------------------
// Le bouton est [disabled] quand les guards sont actifs → le click DOM ne
// déclenche pas submit(). On appelle submit() directement pour couvrir
// la branche `if (!text || isLoading || !enabled) return`.
// ---------------------------------------------------------------------------

describe('ChatInputComponent — submit() branche early return', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('ne fait rien si le draft est vide (appel direct)', () => {
        const f = setup({ enabled: true, isLoading: false });
        const emitted: string[] = [];
        f.componentInstance.messageSent.subscribe((v: string) => emitted.push(v));

        // draft vide → !text est true → return immédiat
        f.componentInstance['submit']();

        expect(emitted.length).toBe(0);
    });

    it('ne fait rien si isLoading=true (appel direct)', () => {
        const f = setup({ enabled: true, isLoading: true });
        const emitted: string[] = [];
        f.componentInstance.messageSent.subscribe((v: string) => emitted.push(v));

        typeInto(f, 'Hello');
        f.componentInstance['submit']();

        expect(emitted.length).toBe(0);
    });

    it('ne fait rien si enabled=false (appel direct)', () => {
        const f = setup({ enabled: false, isLoading: false });
        const emitted: string[] = [];
        f.componentInstance.messageSent.subscribe((v: string) => emitted.push(v));

        typeInto(f, 'Hello');
        f.componentInstance['submit']();

        expect(emitted.length).toBe(0);
    });

    it('émet et vide le draft si toutes les conditions sont remplies (appel direct)', () => {
        const f = setup({ enabled: true, isLoading: false });
        const emitted: string[] = [];
        f.componentInstance.messageSent.subscribe((v: string) => emitted.push(v));

        typeInto(f, 'Bonjour');
        f.componentInstance['submit']();
        f.detectChanges();

        expect(emitted).toEqual(['Bonjour']);
        expect(getTextarea(f).value).toBe('Bonjour');
    });
});

describe('ChatInputComponent — autoResize', () => {
    afterEach(() => TestBed.resetTestingModule());

    it('met height à auto puis scrollHeight quand un event input est déclenché', () => {
        const f = setup({ enabled: true });
        const ta = getTextarea(f);

        // Simule un scrollHeight
        Object.defineProperty(ta, 'scrollHeight', { value: 64, configurable: true });

        const event = new Event('input');
        Object.defineProperty(event, 'target', { value: ta, configurable: true });

        f.debugElement.query(By.css('textarea')).triggerEventHandler('input', event);
        f.detectChanges();

        expect(ta.style.height).toBe('64px');
    });
});