import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { Penpot } from '../core/services/penpot/penpot';
import { IConversationService } from '../features/chat/services/IConversation.service';
import { IApiService } from '../features/chat/services/IApi.service';
import { BehaviorSubject } from 'rxjs';
import { signal } from '@angular/core';

describe('App', () => {
  let penpotMock: any;
  let conversationServiceMock: any;
  let apiServiceMock: jasmine.SpyObj<IApiService>;

  beforeEach(async () => {
    // Mock pour Penpot
    penpotMock = {
      fileIdSubject: new BehaviorSubject<string | null>(null),
      fileId$: new BehaviorSubject<string | null>(null).asObservable()
    };
    penpotMock.fileId$ = penpotMock.fileIdSubject.asObservable();

    // Mock pour IConversationService (utilisé par le composant App)
    conversationServiceMock = {
      messages: signal([]),
      isStreaming: signal(false),
      sendMessage: jasmine.createSpy('sendMessage')
    };

    // Mock pour IApiService (indispensable pour que ConversationService ne crash pas au constructeur)
    apiServiceMock = jasmine.createSpyObj('IApiService', ['initConversation', 'sendMessage']);
    // On simule une promesse pour initConversation pour éviter l'erreur ".then"
    apiServiceMock.initConversation.and.returnValue(Promise.resolve('mock-conv-id'));

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: Penpot, useValue: penpotMock },
        { provide: IConversationService, useValue: conversationServiceMock },
        { provide: IApiService, useValue: apiServiceMock }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
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
    const testId = 'test-project-id-999';

    // Simuler l'arrivée d'un ID de fichier Penpot
    penpotMock.fileIdSubject.next(testId);

    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    // Vérifier que le texte est présent dans le paragraphe <p>
    expect(compiled.querySelector('p')?.textContent).toContain('Project ID: ' + testId);
  });
});