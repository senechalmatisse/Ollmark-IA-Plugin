import { TestBed } from '@angular/core/testing';
import { ConversationStateService } from './conversation-state.service';
import { UserMessage } from '../../message/user-message';
import { AIMessage } from '../../message/ai-message';

describe('ConversationStateService', () => {
    let service: ConversationStateService;

    beforeEach(() => {
        TestBed.configureTestingModule({
        providers: [ConversationStateService]
        });

        service = TestBed.inject(ConversationStateService);
    });

    it('should create', () => {
        expect(service).toBeTruthy();
    });

    it('should initialize with empty messages', () => {
        expect(service.messages()).toEqual([]);
    });

    it('should initialize isStreaming to false', () => {
        expect(service.isStreaming()).toBeFalse();
    });

    it('should initialize pendingAction to false', () => {
        expect(service.pendingAction()).toBeFalse();
    });

    it('should add a message to the end of the history', () => {
        const message = new UserMessage('1', 'hello');

        service.addMessage(message);

        expect(service.messages().length).toBe(1);
        expect(service.messages()[0]).toBe(message);
    });

    it('should append messages in order', () => {
        const first = new UserMessage('1', 'hello');
        const second = new AIMessage('2', 'hi');

        service.addMessage(first);
        service.addMessage(second);

        expect(service.messages()).toEqual([first, second]);
    });

    it('should update the last message content when messages exist', () => {
        const first = new UserMessage('1', 'hello');
        const second = new AIMessage('2', '');

        service.addMessage(first);
        service.addMessage(second);
        service.updateLastAiMessage('updated response');

        expect(service.messages().length).toBe(2);
        expect(service.messages()[0].content).toBe('hello');
        expect(service.messages()[1].content).toBe('updated response');
    });

    it('should do nothing when updateLastAiMessage is called with no messages', () => {
        service.updateLastAiMessage('updated response');

        expect(service.messages()).toEqual([]);
    });

    it('should set isStreaming', () => {
        service.setIsStreaming(true);
        expect(service.isStreaming()).toBeTrue();

        service.setIsStreaming(false);
        expect(service.isStreaming()).toBeFalse();
    });

    it('should set pendingAction', () => {
        service.setPendingAction(true);
        expect(service.pendingAction()).toBeTrue();

        service.setPendingAction(false);
        expect(service.pendingAction()).toBeFalse();
    });

    it('should reset the whole conversation state', () => {
        service.addMessage(new UserMessage('1', 'hello'));
        service.setIsStreaming(true);
        service.setPendingAction(true);

        service.reset();

        expect(service.messages()).toEqual([]);
        expect(service.isStreaming()).toBeFalse();
        expect(service.pendingAction()).toBeFalse();
    });
});