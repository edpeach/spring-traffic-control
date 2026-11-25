import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import {
  A2UiSurfaceState,
  AgentChatMessage,
  AgentProvider,
  ProviderStatus,
} from '../models/agent-chat.model';

interface AgentChatState {
  threadId: string;
  drawerOpen: boolean;
  provider: AgentProvider;
  providers: ProviderStatus[];
  messages: AgentChatMessage[];
  activeAssistantMessageId: string | null;
  isStreaming: boolean;
  error: string | null;
}

function createId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${random}`;
}

const initialState: AgentChatState = {
  threadId: createId('thread'),
  drawerOpen: false,
  provider: 'OLLAMA',
  providers: [
    { id: 'OLLAMA', label: 'Ollama (Local)', model: 'gemma4', available: true, default: true },
    { id: 'GEMINI', label: 'Google Gemini', model: 'gemini', available: false, default: false },
  ],
  messages: [],
  activeAssistantMessageId: null,
  isStreaming: false,
  error: null,
};

export const AgentChatStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed(({ messages }) => ({
    hasMessages: computed(() => messages().length > 0),
  })),
  withMethods((store) => ({
    openDrawer(): void {
      patchState(store, { drawerOpen: true });
    },
    closeDrawer(): void {
      patchState(store, { drawerOpen: false });
    },
    toggleDrawer(): void {
      patchState(store, (state) => ({ drawerOpen: !state.drawerOpen }));
    },
    setProvider(provider: AgentProvider): void {
      patchState(store, { provider });
    },
    setProviders(providers: ProviderStatus[]): void {
      if (providers.length === 0) return;
      const defaultProvider =
        providers.find((p) => p.default && p.available)?.id ??
        providers.find((p) => p.available)?.id ??
        store.provider();
      patchState(store, { providers, provider: defaultProvider });
    },
    newConversation(): void {
      patchState(store, {
        threadId: createId('thread'),
        messages: [],
        activeAssistantMessageId: null,
        isStreaming: false,
        error: null,
      });
    },
    appendUserMessage(text: string): AgentChatMessage {
      const userMessage: AgentChatMessage = {
        id: createId('user'),
        role: 'user',
        text,
        reasoning: '',
        toolCalls: [],
        surfaces: [],
        createdAt: Date.now(),
      };
      const assistantId = createId('asst');
      const assistantMessage: AgentChatMessage = {
        id: assistantId,
        role: 'assistant',
        text: '',
        reasoning: '',
        toolCalls: [],
        surfaces: [],
        createdAt: Date.now(),
      };
      patchState(store, (state) => ({
        messages: [...state.messages, userMessage, assistantMessage],
        activeAssistantMessageId: assistantId,
        isStreaming: true,
        error: null,
      }));
      return userMessage;
    },
    appendReasoningDelta(delta: string): void {
      const activeId = store.activeAssistantMessageId();
      if (!activeId || !delta) return;
      patchState(store, (state) => ({
        messages: state.messages.map((msg) =>
          msg.id === activeId ? { ...msg, reasoning: msg.reasoning + delta } : msg,
        ),
      }));
    },
    appendTextDelta(delta: string): void {
      const activeId = store.activeAssistantMessageId();
      if (!activeId || !delta) return;
      patchState(store, (state) => ({
        messages: state.messages.map((msg) =>
          msg.id === activeId ? { ...msg, text: msg.text + delta } : msg,
        ),
      }));
    },
    startToolCall(id: string, name: string): void {
      const activeId = store.activeAssistantMessageId();
      if (!activeId) return;
      patchState(store, (state) => ({
        messages: state.messages.map((msg) => {
          if (msg.id !== activeId) return msg;
          if (msg.toolCalls.some((tc) => tc.id === id)) return msg;
          return {
            ...msg,
            toolCalls: [...msg.toolCalls, { id, name, args: '', status: 'running' as const }],
          };
        }),
      }));
    },
    appendToolCallArgs(id: string, delta: string): void {
      const activeId = store.activeAssistantMessageId();
      if (!activeId) return;
      patchState(store, (state) => ({
        messages: state.messages.map((msg) =>
          msg.id === activeId
            ? {
                ...msg,
                toolCalls: msg.toolCalls.map((tc) =>
                  tc.id === id ? { ...tc, args: tc.args + delta } : tc,
                ),
              }
            : msg,
        ),
      }));
    },
    finishToolCall(id: string): void {
      const activeId = store.activeAssistantMessageId();
      if (!activeId) return;
      patchState(store, (state) => ({
        messages: state.messages.map((msg) =>
          msg.id === activeId
            ? {
                ...msg,
                toolCalls: msg.toolCalls.map((tc) =>
                  tc.id === id ? { ...tc, status: 'done' as const } : tc,
                ),
              }
            : msg,
        ),
      }));
    },
    addSurface(surface: A2UiSurfaceState): void {
      const activeId = store.activeAssistantMessageId();
      if (!activeId) return;
      patchState(store, (state) => ({
        messages: state.messages.map((msg) => {
          if (msg.id !== activeId) return msg;
          const exists = msg.surfaces.some((s) => s.surfaceId === surface.surfaceId);
          return {
            ...msg,
            surfaces: exists
              ? msg.surfaces.map((s) => (s.surfaceId === surface.surfaceId ? surface : s))
              : [...msg.surfaces, surface],
          };
        }),
      }));
    },
    finishTurn(): void {
      patchState(store, { isStreaming: false, activeAssistantMessageId: null });
    },
    failTurn(errorMessage: string): void {
      patchState(store, {
        isStreaming: false,
        activeAssistantMessageId: null,
        error: errorMessage,
      });
    },
  })),
);
