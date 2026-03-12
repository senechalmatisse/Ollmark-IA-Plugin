import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { App } from './app';
import { Penpot } from '../core/services/penpot/penpot';
import { IConversationService } from '../features/chat/services/IConversation.service';
import { Message } from '../features/message/message';

describe('App', () => {
  let penpotMock: Partial<Penpot> & { fileIdSubject: BehaviorSubject<string | null> };
  let conversationServiceMock: Partial<IConversationService>;

  beforeEach(async () => {
    penpotMock = {
      fileIdSubject: new BehaviorSubject<string | null>(null),
      fileId$: new BehaviorSubject<string | null>(null).asObservable(),
    };
    penpotMock.fileId$ = penpotMock.fileIdSubject.asObservable();

    const mockMessages: readonly Message[] = [
      {
        id: '1',
        content: "Je peux t'aider à modifier automatiquement ta page Penpot.",
        type: 'ai',
        timestamp: new Date('2026-03-12T11:02:00'),
      },
    ];

    conversationServiceMock = {
      messages: signal(mockMessages),
      isStreaming: signal(false),
      sendMessage: jasmine.createSpy('sendMessage'),
      resetConversation: jasmine.createSpy('resetConversation'),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: Penpot, useValue: penpotMock },
        { provide: IConversationService, useValue: conversationServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the chat shell', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.phone-shell')).not.toBeNull();
    expect(compiled.textContent).toContain("Je peux t'aider à modifier automatiquement ta page Penpot.");
  });

  it('should expose the Penpot project ID on the root container', async () => {
    const fixture = TestBed.createComponent(App);
    const testId = 'test-project-id-999';

    penpotMock.fileIdSubject.next(testId);

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.app-root')?.getAttribute('data-file-id')).toBe(testId);
  });
});
