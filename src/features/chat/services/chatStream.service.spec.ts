import { TestBed } from '@angular/core/testing';
import { ChatStreamService } from './chatStream.service';
import { IApiService } from './IApi.service';
import { ConversationStateService } from './conversationState.service';
import { of } from 'rxjs';

/** Unit tests for chunk streaming orchestration. */
describe('ChatStreamService', () => {
  let service: ChatStreamService;
  let apiSpy: jasmine.SpyObj<IApiService>;
  let stateSpy: jasmine.SpyObj<ConversationStateService>;

  beforeEach(() => {
    apiSpy = jasmine.createSpyObj('IApiService', ['sendMessage']);
    stateSpy = jasmine.createSpyObj('ConversationStateService', ['setStreaming', 'updateLastAiMessage', 'handleError']);

    TestBed.configureTestingModule({
      providers: [
        ChatStreamService,
        { provide: IApiService, useValue: apiSpy },
        { provide: ConversationStateService, useValue: stateSpy }
      ]
    });
    service = TestBed.inject(ChatStreamService);
  });

  /** Verifies that text chunks are forwarded to state updates. */
  it('should process text chunks through stateService', () => {
    apiSpy.sendMessage.and.returnValue(of('Hello'));
    service.streamResponse('hi', 'conv-id');
    
    expect(stateSpy.setStreaming).toHaveBeenCalledWith(true);
    expect(stateSpy.updateLastAiMessage).toHaveBeenCalledWith('Hello');
  });

  /** Verifies action control signals are handled without text update. */
  it('should detect special action signals', () => {
    apiSpy.sendMessage.and.returnValue(of('[ACTION_DONE]'));
    const consoleSpy = spyOn(console, 'log');
    
    service.streamResponse('run action', 'conv-id');
    expect(consoleSpy).toHaveBeenCalledWith(jasmine.stringMatching('Signal Penpot'));
    expect(stateSpy.updateLastAiMessage).not.toHaveBeenCalled();
  });
});
