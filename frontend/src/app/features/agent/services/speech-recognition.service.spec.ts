import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SpeechRecognitionLike, SpeechRecognitionService } from './speech-recognition.service';

class MockSpeechRecognition extends EventTarget implements SpeechRecognitionLike {
  static latest: MockSpeechRecognition | null = null;

  continuous = false;
  interimResults = false;
  lang = '';
  onstart: SpeechRecognitionLike['onstart'] = null;
  onresult: SpeechRecognitionLike['onresult'] = null;
  onerror: SpeechRecognitionLike['onerror'] = null;
  onend: SpeechRecognitionLike['onend'] = null;

  constructor() {
    super();
    MockSpeechRecognition.latest = this;
  }

  start(): void {
    this.onstart?.(new Event('start'));
  }

  stop(): void {
    this.onend?.(new Event('end'));
  }

  abort(): void {
    this.onend?.(new Event('end'));
  }

  emitTranscript(text: string, isFinal = true): void {
    const event = {
      resultIndex: 0,
      results: [{ isFinal, length: 1, 0: { transcript: text } }],
    };
    this.onresult?.(event as never);
  }

  emitError(error: string): void {
    this.onerror?.({ error } as never);
  }
}

describe('SpeechRecognitionService', () => {
  let service: SpeechRecognitionService;
  const originalSpeechRecognition = (window as unknown as Record<string, unknown>)[
    'SpeechRecognition'
  ];

  beforeEach(() => {
    MockSpeechRecognition.latest = null;
    (window as unknown as Record<string, unknown>)['SpeechRecognition'] = MockSpeechRecognition;
    TestBed.configureTestingModule({});
    service = TestBed.inject(SpeechRecognitionService);
  });

  afterEach(() => {
    (window as unknown as Record<string, unknown>)['SpeechRecognition'] = originalSpeechRecognition;
  });

  it('streams interim transcripts and fires onComplete when speech ends', () => {
    const onInterim = vi.fn();
    const onComplete = vi.fn();

    expect(service.isSupported).toBe(true);
    service.start({ onInterim, onComplete });
    expect(service.isListening()).toBe(true);

    const instance = MockSpeechRecognition.latest!;
    instance.emitTranscript('Show me KLM844', false);
    expect(onInterim).toHaveBeenCalledWith('Show me KLM844');

    instance.emitTranscript('Show me KLM844 on the map', true);
    instance.stop();

    expect(service.isListening()).toBe(false);
    expect(onComplete).toHaveBeenCalledWith('Show me KLM844 on the map');
  });

  it('does not fire onComplete when cancelled', () => {
    const onComplete = vi.fn();

    service.start({ onComplete });
    const instance = MockSpeechRecognition.latest!;
    instance.emitTranscript('Switch to autumn theme', false);
    service.cancel();

    expect(service.isListening()).toBe(false);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('reports friendly error messages when microphone permission is denied', () => {
    const onComplete = vi.fn();

    service.start({ onComplete });
    MockSpeechRecognition.latest!.emitError('not-allowed');

    expect(service.error()).toContain('Microphone access was denied');
  });
});
