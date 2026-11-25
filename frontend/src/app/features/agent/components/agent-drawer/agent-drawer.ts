import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AgentChatStore } from '../../store/agent-chat.store';
import { AgentChatView } from '../agent-chat-view/agent-chat-view';

@Component({
  host: {
    '(document:keydown.escape)': 'close()',
  },
  imports: [RouterLink, AgentChatView],
  selector: 'app-agent-drawer',
  styleUrl: './agent-drawer.css',
  templateUrl: './agent-drawer.html',
})
export class AgentDrawer {
  readonly fabOffsetRightPx = input(0);

  protected readonly store = inject(AgentChatStore);
  protected readonly isOpen = this.store.drawerOpen;

  protected toggle(): void {
    this.store.toggleDrawer();
  }

  protected close(): void {
    this.store.closeDrawer();
  }
}
