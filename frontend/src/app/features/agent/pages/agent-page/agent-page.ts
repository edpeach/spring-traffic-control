import { Component } from '@angular/core';
import { AgentChatView } from '../../components/agent-chat-view/agent-chat-view';

@Component({
  imports: [AgentChatView],
  selector: 'app-agent-page',
  styleUrl: './agent-page.css',
  templateUrl: './agent-page.html',
})
export class AgentPage {}
