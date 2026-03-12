import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ConversationService } from './conversation-service';
import { ConversationStateService } from './conversation-state.service';
import { IMessage } from '../../message/message';
import { UserMessage } from '../../message/user-message';

describe('ConversationService', () => {
    let service: ConversationService;
    let stateServiceSpy: jasmine.SpyObj<ConversationStateService>;

    beforeEach(() => {
        stateServiceSpy = jasmine.createSpyObj<ConversationStateService>(
        'ConversationStateService',
        ['addMessage', 'reset'],
        {
            messages: signal<IMessage[]>([]),
            isStreaming: signal(false),
            pendingAction: signal(false)
        }
        );

        TestBed.configureTestingModule({
        providers: [
            ConversationService,
            { provide: ConversationStateService, useValue: stateServiceSpy }
        ]
        });

        service = TestBed.inject(ConversationService);
    });

    it('should create', () => {
        expect(service).toBeTruthy();
    });

    it('should expose messages from ConversationStateService', () => {
        const messages = [new UserMessage('1', 'hello')];
        Object.defineProperty(stateServiceSpy, 'messages', {
        value: signal(messages)
        });

        expect(service.messages()).toEqual(messages);
    });

    it('should expose isStreaming from ConversationStateService', () => {
        Object.defineProperty(stateServiceSpy, 'isStreaming', {
        value: signal(true)
        });

        expect(service.isStreaming()).toBeTrue();
    });

    it('should add a trimmed user message when sendMessage is called', () => {
        service.sendMessage('  hello world  ');

        expect(stateServiceSpy.addMessage).toHaveBeenCalledTimes(1);

        const sentMessage = stateServiceSpy.addMessage.calls.mostRecent().args[0] as UserMessage;
        expect(sentMessage).toBeInstanceOf(UserMessage);
        expect(sentMessage.content).toBe('hello world');
        expect(sentMessage.id).toBeTruthy();
    });

    it('should not add a message when sendMessage receives an empty string', () => {
        service.sendMessage('');

        expect(stateServiceSpy.addMessage).not.toHaveBeenCalled();
    });

    it('should not add a message when sendMessage receives only whitespace', () => {
        service.sendMessage('     ');

        expect(stateServiceSpy.addMessage).not.toHaveBeenCalled();
    });

    it('should reset the conversation', () => {
        service.resetConversation();

        expect(stateServiceSpy.reset).toHaveBeenCalled();
    });
});