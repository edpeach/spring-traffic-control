import { Injectable, signal } from '@angular/core';

interface SpeechRecognitionAlternativeLike {
  readonly transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

export interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((event: Event) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

interface SpeechWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export interface SpeechSessionCallbacks {
  onInterim?: (transcript: string) => void;
  onComplete: (finalTranscript: string) => void;
}

@Injectable({ providedIn: 'root' })
export class SpeechRecognitionService {
  readonly isListening = signal(false);
  readonly error = signal<string | null>(null);

  private recognition: SpeechRecognitionLike | null = null;
  private cancelled = false;
  private latestTranscript = '';

  get isSupported(): boolean {
    return this.getConstructor() !== null;
  }

  start(callbacks: SpeechSessionCallbacks): void {
    const Ctor = this.getConstructor();
    if (!Ctor) {
      this.error.set('Speech recognition is not supported in this browser.');
      return;
    }

    if (this.isListening()) {
      this.stop();
      return;
    }

    this.error.set(null);
    this.cancelled = false;
    this.latestTranscript = '';

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang =
      typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US';

    recognition.onstart = () => {
      this.isListening.set(true);
    };

    recognition.onresult = (event) => {
      let combined = '';
      for (const result of Array.from(event.results)) {
        if (result?.[0]?.transcript) {
          combined += result[0].transcript;
        }
      }
      this.latestTranscript = combined.trim();
      callbacks.onInterim?.(this.latestTranscript);
    };

    recognition.onerror = (event) => {
      if (event.error === 'aborted') return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.error.set('Microphone access was denied. Please allow microphone permissions.');
      } else if (event.error === 'no-speech') {
        this.error.set('No speech detected. Please try again.');
      } else {
        this.error.set(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      this.isListening.set(false);
      this.recognition = null;
      const finalTranscript = this.latestTranscript.trim();
      this.latestTranscript = '';
      if (!this.cancelled && finalTranscript.length > 0) {
        callbacks.onComplete(finalTranscript);
      }
    };

    this.recognition = recognition;
    try {
      recognition.start();
    } catch {
      this.isListening.set(false);
      this.recognition = null;
      this.error.set('Unable to start speech recognition.');
    }
  }

  stop(): void {
    this.recognition?.stop();
  }

  cancel(): void {
    this.cancelled = true;
    this.latestTranscript = '';
    this.recognition?.abort();
    this.isListening.set(false);
    this.recognition = null;
  }

  clearError(): void {
    this.error.set(null);
  }

  private getConstructor(): SpeechRecognitionConstructor | null {
    if (typeof window === 'undefined') return null;
    const speechWindow = window as SpeechWindow;
    return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
  }
}
