// import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
// import { ChatInput } from './chat-input';
// import { FormsModule } from '@angular/forms';
// import { of, throwError, Subject } from 'rxjs';
// import { ChatService } from '../services/chat.service';

// describe('ChatInput', () => {
//   let component: ChatInput;
//   let fixture: ComponentFixture<ChatInput>;
//   let chatServiceSpy: jasmine.SpyObj<ChatService>;

//   beforeEach(async () => {
//     chatServiceSpy = jasmine.createSpyObj('ChatService', ['sendMessage']);
//     chatServiceSpy.sendMessage.and.returnValue(of(''));

//     await TestBed.configureTestingModule({
//       imports: [ChatInput, FormsModule],
//       providers: [{ provide: ChatService, useValue: chatServiceSpy }]
//     }).compileComponents();

//     fixture = TestBed.createComponent(ChatInput);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });

//   // ── Initialization ────────────────────────────────────────────────

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });

//   it('should initialize with empty currentValue', () => {
//     expect(component.currentValue()).toBe('');
//   });

//   it('should initialize with isFocused = false', () => {
//     expect(component.isFocused()).toBeFalse();
//   });

//   it('should initialize with isLoading = false', () => {
//     expect(component.isLoading()).toBeFalse();
//   });

//   // ── onSend ────────────────────────────────────────────────────────

//   it('should not send if message is empty', () => {
//     component.currentValue.set('');
//     component.onSend();
//     expect(chatServiceSpy.sendMessage).not.toHaveBeenCalled();
//   });

//   it('should not send if message is only whitespace', () => {
//     component.currentValue.set('   ');
//     component.onSend();
//     expect(chatServiceSpy.sendMessage).not.toHaveBeenCalled();
//   });

//   it('should not send if already loading', () => {
//     component.isLoading.set(true);
//     component.currentValue.set('hello');
//     component.onSend();
//     expect(chatServiceSpy.sendMessage).not.toHaveBeenCalled();
//   });

//   it('should call sendMessage with trimmed text', () => {
//     component.currentValue.set('  hello  ');
//     component.onSend();
//     expect(chatServiceSpy.sendMessage).toHaveBeenCalledWith('hello');
//   });

//   it('should set isLoading to true during send', () => {
//     const subject = new Subject<string>();
//     chatServiceSpy.sendMessage.and.returnValue(subject.asObservable());
//     component.currentValue.set('hello');
//     component.onSend();
//     expect(component.isLoading()).toBeTrue();
//     subject.complete();
//   });

//   it('should reset isLoading to false on complete', fakeAsync(() => {
//     chatServiceSpy.sendMessage.and.returnValue(of('chunk'));
//     component.currentValue.set('hello');
//     component.onSend();
//     tick();
//     expect(component.isLoading()).toBeFalse();
//   }));

//   it('should reset isLoading to false on error', fakeAsync(() => {
//     chatServiceSpy.sendMessage.and.returnValue(throwError(() => new Error('fail')));
//     spyOn(console, 'error');
//     component.currentValue.set('hello');
//     component.onSend();
//     tick();
//     expect(component.isLoading()).toBeFalse();
//   }));

//   it('should clear currentValue after send', () => {
//     component.currentValue.set('hello');
//     component.onSend();
//     expect(component.currentValue()).toBe('');
//   });

//   // ── handleKeyDown ─────────────────────────────────────────────────

//   it('should call onSend on Enter key', () => {
//     spyOn(component, 'onSend');
//     const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
//     component.handleKeyDown(event);
//     expect(component.onSend).toHaveBeenCalled();
//   });

//   it('should NOT call onSend on Shift+Enter', () => {
//     spyOn(component, 'onSend');
//     const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true });
//     component.handleKeyDown(event);
//     expect(component.onSend).not.toHaveBeenCalled();
//   });

//   it('should not call onSend on other keys', () => {
//     spyOn(component, 'onSend');
//     const event = new KeyboardEvent('keydown', { key: 'a' });
//     component.handleKeyDown(event);
//     expect(component.onSend).not.toHaveBeenCalled();
//   });

//   it('should prevent default on Enter', () => {
//     const event = new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false });
//     spyOn(event, 'preventDefault');
//     component.handleKeyDown(event);
//     expect(event.preventDefault).toHaveBeenCalled();
//   });

//   // ── autoResize ────────────────────────────────────────────────────

//   it('should reset height to auto then set scrollHeight', () => {
//     const el = document.createElement('textarea');
//     Object.defineProperty(el, 'scrollHeight', { value: 80, configurable: true });
//     const event = { target: el } as unknown as Event;
//     component.autoResize(event);
//     expect(el.style.height).toBe('80px');
//   });

//   // ── Focus signals ─────────────────────────────────────────────────

//   it('should set isFocused to true on focus event', () => {
//     component.isFocused.set(false);
//     const textarea = fixture.nativeElement.querySelector('textarea');
//     textarea.dispatchEvent(new Event('focus'));
//     expect(component.isFocused()).toBeTrue();
//   });

//   it('should set isFocused to false on blur event', () => {
//     component.isFocused.set(true);
//     const textarea = fixture.nativeElement.querySelector('textarea');
//     textarea.dispatchEvent(new Event('blur'));
//     expect(component.isFocused()).toBeFalse();
//   });

//   // ── Template bindings ─────────────────────────────────────────────

//   it('should disable send button when currentValue is empty', () => {
//     component.currentValue.set('');
//     fixture.detectChanges();
//     const btn = fixture.nativeElement.querySelector('.send-btn');
//     expect(btn.disabled).toBeTrue();
//   });

//   it('should enable send button when currentValue is not empty and not loading', () => {
//     component.currentValue.set('hello');
//     component.isLoading.set(false);
//     fixture.detectChanges();
//     const btn = fixture.nativeElement.querySelector('.send-btn');
//     expect(btn.disabled).toBeFalse();
//   });

//   it('should add focused class to inner container when isFocused is true', () => {
//     component.isFocused.set(true);
//     fixture.detectChanges();
//     const inner = fixture.nativeElement.querySelector('.chat-input-inner');
//     expect(inner.classList.contains('focused')).toBeTrue();
//   });
// });