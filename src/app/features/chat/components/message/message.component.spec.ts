import { MessageComponent } from './message.component';
import { ChatMessage } from '../../../../core/models';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
    return {
        id: 'test-id-001',
        role: 'user',
        content: 'Bonjour',
        timestamp: new Date('2026-03-15T19:35:00.000Z'),
        ...overrides,
    };
}

/**
 * Instanciation directe — MessageComponent n'a pas de template,
 * aucun TestBed nécessaire.
 */
function makeComponent(msg: ChatMessage): MessageComponent {
    const cmp = new MessageComponent();
    cmp.message = msg;
    return cmp;
}

// ---------------------------------------------------------------------------
// isUser
// ---------------------------------------------------------------------------

describe('MessageComponent.isUser', () => {
    it("retourne true quand role === 'user'", () => {
        const cmp = makeComponent(makeMessage({ role: 'user' }));
        expect(cmp.isUser).toBeTrue();
    });

    it("retourne false quand role === 'assistant'", () => {
        const cmp = makeComponent(makeMessage({ role: 'assistant' }));
        expect(cmp.isUser).toBeFalse();
    });
});

// ---------------------------------------------------------------------------
// isAssistant
// ---------------------------------------------------------------------------

describe('MessageComponent.isAssistant', () => {
    it("retourne true quand role === 'assistant'", () => {
        const cmp = makeComponent(makeMessage({ role: 'assistant' }));
        expect(cmp.isAssistant).toBeTrue();
    });

    it("retourne false quand role === 'user'", () => {
        const cmp = makeComponent(makeMessage({ role: 'user' }));
        expect(cmp.isAssistant).toBeFalse();
    });
});

// ---------------------------------------------------------------------------
// isUser / isAssistant — exclusivité mutuelle
// ---------------------------------------------------------------------------

describe('MessageComponent — isUser / isAssistant sont mutuellement exclusifs', () => {
    it("un message 'user' : isUser=true, isAssistant=false", () => {
        const cmp = makeComponent(makeMessage({ role: 'user' }));
        expect(cmp.isUser).toBeTrue();
        expect(cmp.isAssistant).toBeFalse();
    });

    it("un message 'assistant' : isUser=false, isAssistant=true", () => {
        const cmp = makeComponent(makeMessage({ role: 'assistant' }));
        expect(cmp.isUser).toBeFalse();
        expect(cmp.isAssistant).toBeTrue();
    });
});

// ---------------------------------------------------------------------------
// senderLabel
// ---------------------------------------------------------------------------

describe('MessageComponent.senderLabel', () => {
    it("retourne 'Vous' pour un message utilisateur", () => {
        const cmp = makeComponent(makeMessage({ role: 'user' }));
        expect(cmp.senderLabel).toBe('Vous');
    });

    it("retourne 'IA' pour un message assistant", () => {
        const cmp = makeComponent(makeMessage({ role: 'assistant' }));
        expect(cmp.senderLabel).toBe('IA');
    });
});

// ---------------------------------------------------------------------------
// formattedTime
// ---------------------------------------------------------------------------

describe('MessageComponent.formattedTime', () => {
    it('retourne une chaîne au format HH:MM', () => {
        const cmp = makeComponent(makeMessage({
            timestamp: new Date('2026-03-15T08:05:00.000Z'),
        }));
        // Format attendu : "HH:MM" — on vérifie la structure indépendamment du fuseau
        expect(cmp.formattedTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('retourne deux chiffres pour les heures < 10 (zéro initial)', () => {
        const cmp = makeComponent(makeMessage({
            timestamp: new Date('2026-03-15T08:05:00.000Z'),
        }));
        expect(cmp.formattedTime.length).toBe(5);
        expect(cmp.formattedTime[2]).toBe(':');
    });

    it('utilise bien les minutes du timestamp', () => {
        // On crée deux timestamps différant uniquement par la minute
        const cmp35 = makeComponent(makeMessage({ timestamp: new Date('2026-03-15T10:35:00.000Z') }));
        const cmp42 = makeComponent(makeMessage({ timestamp: new Date('2026-03-15T10:42:00.000Z') }));
        const minutes35 = cmp35.formattedTime.split(':')[1];
        const minutes42 = cmp42.formattedTime.split(':')[1];
        expect(minutes35).toBe('35');
        expect(minutes42).toBe('42');
    });

    it('produit des valeurs différentes pour des timestamps distincts', () => {
        const cmp1 = makeComponent(makeMessage({ timestamp: new Date('2026-03-15T09:00:00.000Z') }));
        const cmp2 = makeComponent(makeMessage({ timestamp: new Date('2026-03-15T11:30:00.000Z') }));
        expect(cmp1.formattedTime).not.toBe(cmp2.formattedTime);
    });
});