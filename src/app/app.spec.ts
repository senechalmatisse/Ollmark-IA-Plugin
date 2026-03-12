import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { App } from './app';
import { CONVERSATION_SERVICE } from '../core/tokens/conversation-service.token';
import { ChatService } from '../features/chat/services/chat.service';
import { IConversationService } from '../features/chat/services/i-conversation.service';

describe('App', () => {
  const conversationServiceMock: IConversationService = {
    messages: signal([]),
    isStreaming: signal(false),
    sendMessage: jasmine.createSpy('sendMessage'),
    resetConversation: jasmine.createSpy('resetConversation')
  };

  const chatServiceMock = {
    messages: signal([]),
    conversationId: signal('')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: CONVERSATION_SERVICE, useValue: conversationServiceMock },
        { provide: ChatService, useValue: chatServiceMock }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Ollmark-plugin-ia');
  });

  it('should render project ID when it is available', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    const testId = 'test-project-id-999';

    // @ts-expect-error test access
    app.penpot.fileIdSubject.next(testId);

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('p')?.textContent).toContain('Project ID: ' + testId);
  });
});