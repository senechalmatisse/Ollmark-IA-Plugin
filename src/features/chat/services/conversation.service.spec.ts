import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ConversationService } from './conversation.service';
import { IApiService } from './IApi.service';
import { ConversationStateService } from './conversationState.service';
import { ChatStreamService } from './chatStream.service';
import { signal } from '@angular/core';

describe('ConversationService', () => {
  let service: ConversationService;
  let apiSpy: jasmine.SpyObj<IApiService>;
  let stateSpy: any;
  let streamSpy: jasmine.SpyObj<ChatStreamService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('IApiService', ['initConversation']);
    streamSpy = jasmine.createSpyObj('ChatStreamService', ['streamResponse']);
    
    // Mock simple pour le signal de messages
    stateSpy = {
      messages: signal([]),
      isStreaming: signal(false),
      addMessage: jasmine.createSpy('addMessage')
    };

    apiSpy.initConversation.and.resolveTo('conv-123');

    TestBed.configureTestingModule({
      providers: [
        ConversationService,
        { provide: IApiService, useValue: apiSpy },
        { provide: ConversationStateService, useValue: stateSpy },
        { provide: ChatStreamService, useValue: streamSpy }
      ]
    });
    service = TestBed.inject(ConversationService);
  });

  it('should initialize conversation ID on start', fakeAsync(() => {
    tick(); // Attend la résolution de initConversation
    expect(apiSpy.initConversation).toHaveBeenCalled();
  }));

  it('should add user message and AI placeholder then call stream', () => {
    service.sendMessage('Test message');
    
    expect(stateSpy.addMessage).toHaveBeenCalledTimes(2); // User + AI Placeholder
    expect(streamSpy.streamResponse).toHaveBeenCalledWith('Test message', jasmine.any(String));
  });

  it('should not send empty messages', () => {
    service.sendMessage('   ');
    expect(stateSpy.addMessage).not.toHaveBeenCalled();
  });
});