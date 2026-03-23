import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatContainerComponent } from './chat-container.component';
import { ChatFacadeService } from '../../../core/services';
import { By } from '@angular/platform-browser';
import { signal, WritableSignal } from '@angular/core';

class MockChatFacadeService {
  messages: WritableSignal<unknown[]> = signal([]);
  isLoading: WritableSignal<boolean> = signal(false);
  projectId: WritableSignal<string | null> = signal('project-1');
  hasMessages: WritableSignal<boolean> = signal(false);

  sendMessage = jasmine.createSpy('sendMessage');
  resetConversation = jasmine.createSpy('resetConversation');
  acceptPreview = jasmine.createSpy('acceptPreview');
  rejectPreview = jasmine.createSpy('rejectPreview');
}

describe('ChatContainerComponent', () => {
  let component: ChatContainerComponent;
  let fixture: ComponentFixture<ChatContainerComponent>;
  let facade: MockChatFacadeService;

  beforeEach(async () => {
    facade = new MockChatFacadeService();

    await TestBed.configureTestingModule({
      imports: [ChatContainerComponent],
      providers: [{ provide: ChatFacadeService, useValue: facade }],
    }).compileComponents();

    fixture = TestBed.createComponent(ChatContainerComponent);
    component = fixture.componentInstance;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call sendMessage', () => {
    component['onMessageSent']('hello');

    expect(facade.sendMessage).toHaveBeenCalledWith('hello');
  });

  it('should call resetConversation', () => {
    component['onConversationCleared']();

    expect(facade.resetConversation).toHaveBeenCalled();
  });

  it('should display reset button when there are messages', () => {
    facade.hasMessages.set(true);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('app-generic-button'));

    expect(button).not.toBeNull();
  });

  it('should hide reset button when there are no messages', () => {
    facade.hasMessages.set(false);
    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('app-generic-button'));

    expect(button).toBeNull();
  });

  it('should disable reset button when loading', () => {
    facade.hasMessages.set(true);
    facade.isLoading.set(true);

    fixture.detectChanges();

    const button = fixture.debugElement.query(By.css('app-generic-button'));

    expect(button.componentInstance.disabled).toBeTrue();
  });

  it('should enable chat input when projectId exists', () => {
    facade.projectId.set('123');
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('app-chat-input'));

    expect(input.componentInstance.enabled).toBeTrue();
  });

  it('should disable chat input when projectId is null', () => {
    facade.projectId.set(null);
    fixture.detectChanges();

    const input = fixture.debugElement.query(By.css('app-chat-input'));

    expect(input.componentInstance.enabled).toBeFalse();
  });

  it('should call acceptPreview with bufferPageId and code', () => {
    component['onPreviewAccepted']({ bufferPageId: 'buf-001', code: 'console.log()' });
    expect(facade.acceptPreview).toHaveBeenCalledWith('buf-001', 'console.log()');
  });

  it('should call rejectPreview with bufferPageId', () => {
    component['onPreviewRejected']('buf-001');
    expect(facade.rejectPreview).toHaveBeenCalledWith('buf-001');
  });

  it('should call acceptPreview with empty code', () => {
    component['onPreviewAccepted']({ bufferPageId: 'buf-002', code: '' });
    expect(facade.acceptPreview).toHaveBeenCalledWith('buf-002', '');
  });

  it('should call rejectPreview with different bufferPageId', () => {
    component['onPreviewRejected']('buf-xyz');
    expect(facade.rejectPreview).toHaveBeenCalledWith('buf-xyz');
  });
});
