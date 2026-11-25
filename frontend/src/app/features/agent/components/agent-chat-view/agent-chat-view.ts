import {
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { MarkdownComponent } from 'ngx-markdown';
import { AgentProvider } from '../../models/agent-chat.model';
import { AguiClientService } from '../../services/agui-client.service';
import { SpeechRecognitionService } from '../../services/speech-recognition.service';
import { AgentChatStore } from '../../store/agent-chat.store';
import { A2UiSurfaceHost } from '../a2ui-surface-host/a2ui-surface-host';

const AUTO_SCROLL_THRESHOLD_PX = 80;

@Component({
  selector: 'app-agent-chat-view',
  imports: [A2UiSurfaceHost, MarkdownComponent],
  templateUrl: './agent-chat-view.html',
  styleUrl: './agent-chat-view.css',
})
export class AgentChatView {
  readonly mode = input<'drawer' | 'fullscreen'>('drawer');

  protected readonly store = inject(AgentChatStore);
  protected readonly speech = inject(SpeechRecognitionService);
  private readonly client = inject(AguiClientService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly transcriptContainer = viewChild<ElementRef<HTMLElement>>('transcriptContainer');
  private shouldAutoScroll = true;

  protected readonly draft = signal('');

  constructor() {
    effect(() => {
      this.store.messages();
      this.store.isStreaming();
      this.store.error();
      if (!this.shouldAutoScroll) return;
      this.scrollToBottom();
    });

    this.destroyRef.onDestroy(() => {
      if (this.speech.isListening()) {
        this.speech.cancel();
      }
    });
  }

  protected readonly suggestions: readonly string[] = [
    'Open the map',
    'Navigate to the stations',
    'Show me Amsterdam airport',
    'Show me KL702 on the map with the 5 closest airports',
  ];

  protected selectProvider(provider: AgentProvider): void {
    this.store.setProvider(provider);
  }

  protected async send(prompt?: string): Promise<void> {
    if (this.speech.isListening()) {
      this.speech.cancel();
    }
    const text = (prompt ?? this.draft()).trim();
    if (!text || this.store.isStreaming()) return;
    this.shouldAutoScroll = true;
    this.draft.set('');
    this.speech.clearError();
    await this.client.sendMessage(text);
  }

  protected onTranscriptScroll(): void {
    const el = this.transcriptContainer()?.nativeElement;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.shouldAutoScroll = distanceFromBottom <= AUTO_SCROLL_THRESHOLD_PX;
  }

  private scrollToBottom(): void {
    const scroll = () => {
      const el = this.transcriptContainer()?.nativeElement;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    };
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(scroll);
    } else {
      scroll();
    }
  }

  protected toggleVoiceInput(): void {
    if (this.store.isStreaming()) return;

    if (this.speech.isListening()) {
      this.speech.stop();
      return;
    }

    const prefix = this.draft().trim();
    this.speech.start({
      onInterim: (transcript) => {
        const combined = prefix ? `${prefix} ${transcript}`.trim() : transcript;
        this.draft.set(combined);
      },
      onComplete: (finalTranscript) => {
        const combined = prefix ? `${prefix} ${finalTranscript}`.trim() : finalTranscript;
        if (combined) {
          void this.send(combined);
        }
      },
    });
  }

  protected onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement | null;
    this.draft.set(target?.value ?? '');
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.send();
    }
  }

  protected newChat(): void {
    this.store.newConversation();
  }
}
