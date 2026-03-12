import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatInput } from './chat-input';
import { FormsModule } from '@angular/forms';
import { CONVERSATION_SERVICE } from '../../../core/tokens/conversation-service.token';
import { IConversationService } from '../services/i-conversation.service';
import { IMessage } from '../../message/message';

describe('ChatInput', () => {
  let component: ChatInput;
  let fixture: ComponentFixture<ChatInput>;
  let conversationServiceMock: IConversationService;
  let sendMessageSpy: jasmine.Spy;
  let isStreaming: ReturnType<typeof signal<boolean>>;

  beforeEach(async () => {
    sendMessageSpy = jasmine.createSpy('sendMessage');
    isStreaming = signal(false);

    conversationServiceMock = {
      messages: signal<IMessage[]>([]),
      isStreaming,
      sendMessage: sendMessageSpy,
      resetConversation: jasmine.createSpy('resetConversation')
    };

    await TestBed.configureTestingModule({
      imports: [ChatInput, FormsModule],
      providers: [{ provide: CONVERSATION_SERVICE, useValue: conversationServiceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(ChatInput);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  // ── Initialization ────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty currentValue', () => {
    expect(component.currentValue()).toBe('');
  });

  it('should initialize with isFocused = false', () => {
    expect(component.isFocused()).toBeFalse();
  });

  it('should initialize with isLoading = false', () => {
    expect(component.isLoading()).toBeFalse();
  });

  // ── onSend ────────────────────────────────────────────────────────

  it('should not send if message is empty', () => {
    component.currentValue.set('');
    component.onSend();
    expect(sendMessageSpy).not.toHaveBeenCalled();
  });

  it('should not send if message is only whitespace', () => {
    component.currentValue.set('   ');
    component.onSend();
    expect(sendMessageSpy).not.toHaveBeenCalled();
  });

  it('should not send if already loading', () => {
    isStreaming.set(true);
    component.currentValue.set('hello');
    component.onSend();
    expect(sendMessageSpy).not.toHaveBeenCalled();
  });

  it('should call sendMessage with trimmed text', () => {
    component.currentValue.set('  hello  ');
    component.onSend();
    expect(sendMessageSpy).toHaveBeenCalledWith('hello');
  });

  it('should clear currentValue after send', () => {
    component.currentValue.set('hello');
    component.onSend();
    expect(component.currentValue()).toBe('');
  });

  // ── handleKeyDown ─────────────────────────────────────────────────

  it('should call onSend on Enter key', () => {
    spyOn(component, 'onSend');
    const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
    component.handleKeyDown(event);
    expect(component.onSend).toHaveBeenCalled();
  });

  it('should NOT call onSend on Shift+Enter', () => {
    spyOn(component, 'onSend');
    const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
    component.handleKeyDown(event);
    expect(component.onSend).not.toHaveBeenCalled();
  });

  it('should not call onSend on other keys', () => {
    spyOn(component, 'onSend');
    const event = new KeyboardEvent('keydown', { key: 'a' });
    component.handleKeyDown(event);
    expect(component.onSend).not.toHaveBeenCalled();
  });

  it('should prevent default on Enter', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
    spyOn(event, 'preventDefault');
    component.handleKeyDown(event);
    expect(event.preventDefault).toHaveBeenCalled();
  });

  // ── autoResize ────────────────────────────────────────────────────

  it('should reset height to auto then set scrollHeight', () => {
    const el = document.createElement('textarea');
    Object.defineProperty(el, 'scrollHeight', { value: 80, configurable: true });
    const event = { target: el } as unknown as Event;
    component.autoResize(event);
    expect(el.style.height).toBe('80px');
  });

  // ── Focus signals ─────────────────────────────────────────────────

  it('should set isFocused to true on focus event', () => {
    component.isFocused.set(false);
    const textarea = fixture.nativeElement.querySelector('textarea');
    textarea.dispatchEvent(new Event('focus'));
    expect(component.isFocused()).toBeTrue();
  });

  it('should set isFocused to false on blur event', () => {
    component.isFocused.set(true);
    const textarea = fixture.nativeElement.querySelector('textarea');
    textarea.dispatchEvent(new Event('blur'));
    expect(component.isFocused()).toBeFalse();
  });

  // ── Template bindings ─────────────────────────────────────────────

  it('should disable send button when currentValue is empty', () => {
    component.currentValue.set('');
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.send-btn');
    expect(btn.disabled).toBeTrue();
  });

  it('should enable send button when currentValue is not empty and not loading', () => {
    component.currentValue.set('hello');
    isStreaming.set(false);
    fixture.detectChanges();
    const btn = fixture.nativeElement.querySelector('.send-btn');
    expect(btn.disabled).toBeFalse();
  });

  it('should add focused class to inner container when isFocused is true', () => {
    component.isFocused.set(true);
    fixture.detectChanges();
    const inner = fixture.nativeElement.querySelector('.chat-input-inner');
    expect(inner.classList.contains('focused')).toBeTrue();
  });
});
