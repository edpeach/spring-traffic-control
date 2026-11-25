import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MARKED_OPTIONS, provideMarkdown } from 'ngx-markdown';
import { AgentChatStore } from '../../store/agent-chat.store';
import { AgentChatView } from './agent-chat-view';

describe('AgentChatView', () => {
  let fixture: ComponentFixture<AgentChatView>;
  let store: InstanceType<typeof AgentChatStore>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgentChatView],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideMarkdown({
          markedOptions: {
            provide: MARKED_OPTIONS,
            useValue: { gfm: true, breaks: true },
          },
        }),
      ],
    }).compileComponents();

    store = TestBed.inject(AgentChatStore);
    fixture = TestBed.createComponent(AgentChatView);
    await fixture.whenStable();
  });

  it('renders assistant messages as formatted markdown', async () => {
    store.appendUserMessage('Status of KL0702?');
    store.appendTextDelta('**KL0702** approaching `EHAM`\n\n- Runway: 18R\n- Gate: D24');
    store.finishTurn();
    fixture.detectChanges();
    await fixture.whenStable();

    const markdownEl = fixture.nativeElement.querySelector('.chat-markdown') as HTMLElement;
    expect(markdownEl).toBeTruthy();
    expect(markdownEl.querySelector('strong')?.textContent).toBe('KL0702');
    expect(markdownEl.querySelector('code')?.textContent).toBe('EHAM');
    expect(markdownEl.querySelectorAll('li').length).toBe(2);
  });
});
